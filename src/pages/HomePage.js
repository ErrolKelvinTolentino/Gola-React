import React from 'react';
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, PieChart, Pie
} from 'recharts';
import QuotesBanner from '../components/QuotesBanner';

function HomePage({ goalsCount, allTaskCount, activeTasksCount, completionRate, completedToday, selectedGoal, today }) {

  // Data for the Pie Chart: Tasks Today
  const pieData = [
    { name: 'Completed', value: completedToday, color: 'var(--blue)' },
    { name: 'Remaining', value: Math.max(0, activeTasksCount - completedToday), color: 'var(--muted)' }
  ];

  return (
    <section className="page page-enter" style={{ padding: '24px 32px' }}>

      {/* 1. Clear Context / Header - High Visual Hierarchy */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '2.4rem', letterSpacing: '-0.03em', marginBottom: '4px' }}>
          Welcome back.
        </h1>
        <p className="lead" style={{ margin: 0 }}>
          Today is {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}. Here's your execution cockpit.
        </p>
      </div>

      {/* 2. Top Overview Metrics (Full width grid) */}
      <div className="cards-grid" style={{ marginBottom: '24px' }}>

        <article className="card premium-surface" style={{ padding: '20px', background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)', color: 'white', border: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p className="eyebrow" style={{ color: 'rgba(255,255,255,0.85)', marginBottom: '8px' }}>Today's Execution</p>
              <h2 style={{ color: 'white', fontSize: '2rem', margin: 0 }}>{completionRate}%</h2>
            </div>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.9)', margin: '12px 0 0', fontSize: '0.9rem', fontWeight: '500' }}>
            {completedToday} of {activeTasksCount || 0} tasks completed today.
          </p>
        </article>

        <article className="card metric-card" style={{ padding: '20px' }}>
          <p className="eyebrow" style={{ marginBottom: '8px' }}>Global Workload</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <h2 style={{ fontSize: '2rem', margin: 0 }}>{allTaskCount}</h2>
            <span style={{ color: 'var(--muted)', fontWeight: '500' }}>total tasks</span>
          </div>
          <p className="text-muted" style={{ margin: '12px 0 0', fontSize: '0.9rem', fontWeight: '500' }}>
            Across {goalsCount} active goals.
          </p>
        </article>

        <article className="card metric-card" style={{ padding: '20px' }}>
          <p className="eyebrow" style={{ marginBottom: '8px' }}>Focused Target</p>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h2 style={{ fontSize: '1.2rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {selectedGoal ? selectedGoal.name : 'No goal selected'}
            </h2>
            <p className="text-muted" style={{ margin: '8px 0 0', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {selectedGoal ? selectedGoal.vision : 'Select or create a goal to prioritize.'}
            </p>
          </div>
        </article>
      </div>


      {/* 3. Analytics & Auxiliary Data (2 Columns) */}

      <div className="two-col-layout">

        {/* Left Column: Trend Graph & Quotes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <article className="card metric-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', margin: 0, height: '280px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <p className="eyebrow" style={{ margin: 0 }}>Velocity Trend (7 days)</p>
            </div>

            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={[
                    { day: 'Mon', score: 40 },
                    { day: 'Tue', score: 65 },
                    { day: 'Wed', score: 55 },
                    { day: 'Thu', score: 80 },
                    { day: 'Fri', score: 95 },
                    { day: 'Sat', score: Math.max(10, completionRate - 20) },
                    { day: 'Sun', score: completionRate }
                  ]}
                  margin={{ top: 10, right: 0, left: -25, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel)', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontSize: '0.9rem', padding: '8px 12px' }}
                    itemStyle={{ color: 'var(--text)', fontWeight: '600' }}
                  />
                  <Area type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </article>

          {/* Quote placed logically under the graph rather than top-level */}
          <QuotesBanner />
        </div>

        {/* Right Column: Breakdown Pie */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <article className="card metric-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', margin: 0, height: '280px' }}>
            <p className="eyebrow" style={{ marginBottom: '16px' }}>Today's Balance</p>
            <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
              {activeTasksCount > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-strong)', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '8px 12px' }}
                      itemStyle={{ fontWeight: '600' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '0.95rem' }}>
                  No active workload today.
                </div>
              )}
              {activeTasksCount > 0 && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <span style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--text)' }}>{completionRate}%</span>
                </div>
              )}
            </div>
          </article>
        </div>

      </div>
    </section>
  );
}

export default HomePage;
