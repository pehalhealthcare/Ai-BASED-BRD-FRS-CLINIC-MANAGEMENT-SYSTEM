const Card = ({ children, className = '' }) => (
  <article className={`rounded-[30px] border border-stone-200/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(250,250,249,0.96)_100%)] p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] ${className}`}>
    {children}
  </article>
);

export default Card;
