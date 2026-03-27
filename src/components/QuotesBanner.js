import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const Banner = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--panel-strong);
  border: var(--glass-border);
  padding: 16px 24px;
  border-radius: 20px;
  box-shadow: var(--shadow);
  animation: slideFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
  animation-delay: 0.2s;
`;

const QuoteIcon = styled.div`
  font-size: 1.8rem;
  margin-right: 4px;
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
`;

const QuoteText = styled.p`
  margin: 0;
  font-size: 1.05rem;
  font-weight: 500;
  color: var(--text);
  font-style: italic;
  animation: fadeIn 1s ease forwards;
`;

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
    <Banner className="premium-surface">
      <QuoteIcon>✨</QuoteIcon>
      <QuoteText key={quoteIdx}>
        "{QUOTES[quoteIdx]}"
      </QuoteText>
    </Banner>
  );
}

export default QuotesBanner;
