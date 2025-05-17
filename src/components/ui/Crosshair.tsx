'use client';

import React from 'react';

export default function Crosshair() {
  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '20px',
        height: '20px',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '9px',
          left: 0,
          width: '100%',
          height: '2px',
          background: 'white',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '9px',
          top: 0,
          width: '2px',
          height: '100%',
          background: 'white',
        }}
      />
    </div>
  );
} 