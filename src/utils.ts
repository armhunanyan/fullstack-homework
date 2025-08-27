export const now = () => Date.now();

export const randomColor = () =>
  `hsl(${Math.floor(Math.random()*360)}, 70%, 60%)`;

export function debounce<T extends (...args:any[])=>void>(fn:T, wait=150){
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(()=>fn(...args), wait);
  };
}