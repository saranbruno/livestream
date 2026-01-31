import { useEffect, useState } from 'react';

export default function App() {
  const [msg, setMsg] = useState('Carregando...');

  useEffect(() => {
    fetch('http://localhost:3000')
      .then(res => res.text())
      .then(setMsg);
  }, []);

  return (
    <div></div>
  );
}
