import React from 'react';
import CustomerTrackingMap from './CustomerTrackingMap';

/**
 * MapSimulator (Backward compatibility wrapper for CustomerTrackingMap)
 * Provides road-accurate live delivery tracking for customers.
 */
export default function MapSimulator(props) {
  return <CustomerTrackingMap {...props} />;
}
