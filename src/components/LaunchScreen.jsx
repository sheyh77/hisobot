import { useEffect, useState } from "react";

function LaunchScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 1500);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;
  return <div className="launch-screen" aria-label="Moliyam yuklanmoqda"><div className="launch-mark"><span /><span /></div><strong>Moliyam</strong><small>moliyangiz o'z nazoratingizda</small></div>;
}

export default LaunchScreen;
