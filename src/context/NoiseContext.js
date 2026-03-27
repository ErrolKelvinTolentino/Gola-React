import React, { createContext, useState, useRef, useEffect, useContext } from 'react';

const NoiseContext = createContext();

export function NoiseProvider({ children }) {
  const [activeNoise, setActiveNoise] = useState('none');
  const noiseNodeRef = useRef(null);
  const audioCtxRef = useRef(null);

  const toggleNoise = (type) => {
    if (activeNoise === type) {
      if (noiseNodeRef.current) noiseNodeRef.current.disconnect();
      setActiveNoise('none');
      return;
    }

    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    if (noiseNodeRef.current) noiseNodeRef.current.disconnect();

    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'White Noise') {
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    } else if (type === 'Brown Noise') {
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        let white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      }
    } else if (type === 'Pink Noise') {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        let white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        data[i] *= 0.11; // compensation
        b6 = white * 0.115926;
      }
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.05; // Low ambient volume

    noiseSource.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseSource.start();

    noiseNodeRef.current = noiseGain;
    setActiveNoise(type);
  };

  const stopNoise = () => {
    if (noiseNodeRef.current) noiseNodeRef.current.disconnect();
    setActiveNoise('none');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (noiseNodeRef.current) noiseNodeRef.current.disconnect();
    };
  }, []);

  return (
    <NoiseContext.Provider value={{ activeNoise, toggleNoise, stopNoise }}>
      {children}
    </NoiseContext.Provider>
  );
}

export const useNoise = () => useContext(NoiseContext);
