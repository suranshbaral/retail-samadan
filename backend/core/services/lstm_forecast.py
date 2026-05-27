"""
LSTM Demand Forecasting Pipeline
----------------------------------
Proprietary time-series forecasting engine for convenience retail.
Architecture and training methodology confidential.

Production model replaces moving average baseline when location
sales history meets minimum threshold requirements.

Interfaces: lstm_forecast_product() — drop-in replacement for
            core/services/demand_forecast.py
"""

import numpy as np
from datetime import timedelta
from django.utils import timezone

# ─── Conditional import — LSTM optional until training data ready ─────────────
try:
    import tensorflow as tf
    from tensorflow.keras.models import Sequential, load_model
    from tensorflow.keras.layers import LSTM, Dense, Dropout
    from tensorflow.keras.callbacks import EarlyStopping
    LSTM_AVAILABLE = True
except ImportError:
    LSTM_AVAILABLE = False

try:
    from sklearn.preprocessing import MinMaxScaler
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False


# ─── Config ───────────────────────────────────────────────────────────────────
LOOKBACK_DAYS = 30       # how many days of history to use as input
FORECAST_DAYS = 7        # how many days to predict
MIN_TRAINING_DAYS = 90   # minimum history required before LSTM is reliable
LSTM_UNITS = 64          # neurons in LSTM layer
DROPOUT_RATE = 0.2
EPOCHS = 100
BATCH_SIZE = 16


# ─── Data preparation ─────────────────────────────────────────────────────────
def prepare_sequences(series: list, lookback: int = LOOKBACK_DAYS):
    """
    Convert a time series into supervised learning sequences.
    
    Input:  [1.0, 2.0, 3.0, 4.0, 5.0]  (daily sales quantities)
    Output: X = [[1,2,3]], y = [4]  (lookback window → next value)
    
    Args:
        series: List of daily sales quantities (floats)
        lookback: Number of past days to use as features
    
    Returns:
        X: numpy array of shape (n_samples, lookback, 1)
        y: numpy array of shape (n_samples,)
        scaler: fitted MinMaxScaler for inverse transform
    """
    if not SKLEARN_AVAILABLE:
        raise ImportError("scikit-learn required. Run: pip install scikit-learn")

    data = np.array(series, dtype=np.float32).reshape(-1, 1)
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled = scaler.fit_transform(data)

    X, y = [], []
    for i in range(lookback, len(scaled)):
        X.append(scaled[i - lookback:i, 0])
        y.append(scaled[i, 0])

    return np.array(X).reshape(-1, lookback, 1), np.array(y), scaler


# ─── Model architecture ───────────────────────────────────────────────────────
def build_lstm_model(lookback: int = LOOKBACK_DAYS) -> 'tf.keras.Model':
    """
    Build the LSTM model architecture.
    
    Architecture:
        LSTM(64) → Dropout(0.2) → LSTM(32) → Dropout(0.2) → Dense(1)
    
    Two-layer LSTM captures both short-term daily patterns
    and longer weekly seasonality in convenience store sales.
    """
    if not LSTM_AVAILABLE:
        raise ImportError("TensorFlow required. Run: pip install tensorflow")

    model = Sequential([
        LSTM(LSTM_UNITS, return_sequences=True, input_shape=(lookback, 1)),
        Dropout(DROPOUT_RATE),
        LSTM(32, return_sequences=False),
        Dropout(DROPOUT_RATE),
        Dense(16, activation='relu'),
        Dense(1),
    ])

    model.compile(
        optimizer='adam',
        loss='mean_squared_error',
        metrics=['mae'],
    )
    return model


# ─── Training ─────────────────────────────────────────────────────────────────
def train_lstm(series: list, lookback: int = LOOKBACK_DAYS, save_path: str = None):
    """
    Train the LSTM model on historical sales data.
    
    Requires MIN_TRAINING_DAYS (90) of data for reliable predictions.
    Uses early stopping to prevent overfitting on small datasets.
    
    Args:
        series: Daily sales quantities — must have 90+ values
        lookback: Window size for input sequences
        save_path: Optional path to save trained model weights
    
    Returns:
        dict with model, scaler, training history, and metrics
    """
    if len(series) < MIN_TRAINING_DAYS:
        return {
            'status': 'insufficient_data',
            'message': f'Need {MIN_TRAINING_DAYS} days of data, have {len(series)}.',
            'recommendation': 'Using moving average fallback until data is sufficient.',
        }

    X, y, scaler = prepare_sequences(series, lookback)

    # Train/val split — last 20% for validation
    split = int(len(X) * 0.8)
    X_train, X_val = X[:split], X[split:]
    y_train, y_val = y[:split], y[split:]

    model = build_lstm_model(lookback)

    early_stop = EarlyStopping(
        monitor='val_loss',
        patience=10,
        restore_best_weights=True,
        verbose=0,
    )

    history = model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        callbacks=[early_stop],
        verbose=0,
    )

    # Evaluate
    val_loss, val_mae = model.evaluate(X_val, y_val, verbose=0)

    if save_path:
        model.save(save_path)

    return {
        'status': 'trained',
        'model': model,
        'scaler': scaler,
        'val_loss': float(val_loss),
        'val_mae': float(val_mae),
        'epochs_trained': len(history.history['loss']),
        'training_samples': len(X_train),
    }


# ─── Inference ────────────────────────────────────────────────────────────────
def predict_lstm(model, scaler, series: list, forecast_days: int = FORECAST_DAYS):
    """
    Generate demand forecast using trained LSTM model.
    
    Uses recursive multi-step forecasting:
    each predicted value is fed back as input for the next prediction.
    
    Args:
        model: Trained Keras model
        scaler: Fitted MinMaxScaler from training
        series: Recent sales history (at least LOOKBACK_DAYS values)
        forecast_days: Number of days to predict
    
    Returns:
        List of dicts with date, predicted_qty, lower_bound, upper_bound
    """
    from datetime import datetime, timedelta

    data = np.array(series[-LOOKBACK_DAYS:], dtype=np.float32).reshape(-1, 1)
    scaled = scaler.transform(data)
    input_seq = scaled.reshape(1, LOOKBACK_DAYS, 1)

    predictions = []
    current_seq = input_seq.copy()

    for i in range(forecast_days):
        pred_scaled = model.predict(current_seq, verbose=0)[0, 0]
        pred_value = scaler.inverse_transform([[pred_scaled]])[0, 0]
        pred_value = max(0, pred_value)

        # Confidence band — widens with forecast horizon
        uncertainty = pred_value * 0.08 * (1 + i * 0.15)

        predictions.append({
            'day': i + 1,
            'predicted_qty': round(float(pred_value), 2),
            'lower_bound': round(max(0, float(pred_value - uncertainty)), 2),
            'upper_bound': round(float(pred_value + uncertainty), 2),
        })

        # Slide window forward
        new_input = np.append(current_seq[0, 1:, 0], pred_scaled)
        current_seq = new_input.reshape(1, LOOKBACK_DAYS, 1)

    return predictions


# ─── High-level API (drop-in replacement for demand_forecast.py) ──────────────
def lstm_forecast_product(product, location, fallback_fn=None):
    """
    Main entry point. Attempts LSTM forecast, falls back to moving average
    if insufficient data or TensorFlow not installed.
    
    Args:
        product: Product model instance
        location: Location model instance
        fallback_fn: Callable — moving average forecast function
    
    Returns:
        dict with forecast results and method used
    """
    from core.services.demand_forecast import (
        get_daily_sales_series,
        moving_average_forecast,
    )

    series = get_daily_sales_series(product, location, days=120)
    quantities = [qty for _, qty in series]

    # Check if LSTM is viable
    if not LSTM_AVAILABLE:
        result = moving_average_forecast(series)
        result['method'] = 'moving_average'
        result['reason'] = 'TensorFlow not installed'
        return result

    if len(quantities) < MIN_TRAINING_DAYS:
        result = moving_average_forecast(series)
        result['method'] = 'moving_average'
        result['reason'] = f'Only {len(quantities)} days of data — need {MIN_TRAINING_DAYS}'
        return result

    # Train and predict
    train_result = train_lstm(quantities)

    if train_result['status'] != 'trained':
        result = moving_average_forecast(series)
        result['method'] = 'moving_average'
        result['reason'] = train_result['message']
        return result

    predictions = predict_lstm(
        train_result['model'],
        train_result['scaler'],
        quantities,
    )

    return {
        'method': 'lstm',
        'model_accuracy': {
            'val_loss': train_result['val_loss'],
            'val_mae': train_result['val_mae'],
            'epochs': train_result['epochs_trained'],
        },
        'forecast': predictions,
        'total_forecast_qty': sum(p['predicted_qty'] for p in predictions),
        'training_samples': train_result['training_samples'],
    }