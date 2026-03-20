import React, { useState, useEffect } from 'react';
import './QuotesBanner.css';

const QUOTES = [
  "Focus on the step in front of you, not the whole staircase.",
  "What gets measured, gets managed.",
  "Doubt kills more dreams than failure ever will.",
  "Don't stop when you're tired. Stop when you're done.",
  "The only bad workout is the one that didn't happen.",
  "Small daily improvements over time lead to stunning results.",
  "You don't have to be great to start, but you have to start to be great.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts.",
  "Hard work beats talent when talent doesn't work hard.",
  "Great things never come from comfort zones."
];

function QuotesBanner() {
  const [quoteIdx, setQuoteIdx] = useState(0);

  useEffect(() => {
    // Initial random quote
    setQuoteIdx(Math.floor(Math.random() * QUOTES.length));
    
    const interval = setInterval(() => {
      setQuoteIdx((prev) => (prev + 1) % QUOTES.length);
    }, 15000); // 15 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="quotes-banner premium-surface" style={{ animation: 'slideFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards', opacity: 0, animationDelay: '0.2s' }}>
      <div className="quote-icon" style={{ fontSize: '1.8rem', marginRight: '4px' }}>✨</div>
      <p 
        key={quoteIdx} 
        className="quote-text" 
        style={{ margin: 0, fontSize: '1.05rem', fontWeight: 500, color: 'var(--text)', fontStyle: 'italic', animation: 'fadeIn 1s ease forwards' }}
      >
        "{QUOTES[quoteIdx]}"
      </p>
    </div>
  );
}

export default QuotesBanner;
