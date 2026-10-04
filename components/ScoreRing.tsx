const ScoreRing = ({ score, size = 132 }: { score: number; size?: number }) => {
  const value = Math.max(0, Math.min(100, Math.round(score)));
  return (
    <div
      className="rounded-full grid place-items-center shrink-0"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(var(--color-primary-200) ${value}%, var(--color-dark-200) 0)`,
      }}
      role="img"
      aria-label={`Score ${value} out of 100`}
    >
      <div
        className="rounded-full bg-dark-100 grid place-items-center"
        style={{ width: size - 20, height: size - 20 }}
      >
        <p className="text-3xl font-bold text-primary-100 leading-none">
          {value}
          <span className="text-sm font-normal text-light-400">/100</span>
        </p>
      </div>
    </div>
  );
};

export default ScoreRing;
