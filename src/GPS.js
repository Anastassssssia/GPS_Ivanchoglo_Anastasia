import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';

const calculateDistance = (satellite) => {
  const speedOfSignal = 299792; 
  const timeDifference = (satellite.receivedAt - satellite.sentAt) / 1000; 
  return speedOfSignal * timeDifference;
};

const trilaterate = (satellites) => {
  const [s1, s2, s3] = satellites;

  const d1 = calculateDistance(s1);
  const d2 = calculateDistance(s2);
  const d3 = calculateDistance(s3);

  const A = 2 * (s2.x - s1.x);
  const B = 2 * (s2.y - s1.y);
  const C = 2 * (s3.x - s1.x);
  const D = 2 * (s3.y - s1.y);

  const E = d1**2 - d2**2 + s2.x**2 - s1.x**2 + s2.y**2 - s1.y**2;
  const F = d1**2 - d3**2 + s3.x**2 - s1.x**2 + s3.y**2 - s1.y**2;

  const x = (E * D - B * F) / (A * D - B * C);
  const y = (A * F - E * C) / (A * D - B * C);

  return { x, y };
};

const GPS = () => {
  const [satellites, setSatellites] = useState([]);
  const [objectPosition, setObjectPosition] = useState({ x: 0, y: 0 });

  const [config, setConfig] = useState({
    emulationZoneSize: 200,
    messageFrequency: 1,
    satelliteSpeed: 100,
    objectSpeed: 10,
  });

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:4001');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("data", data);

      setSatellites((prevSatellites) => {
        const updatedSatellites = [...prevSatellites, data].slice(-3);
        if (updatedSatellites.length >= 3) {
          const objectPos = trilaterate(updatedSatellites.slice(0, 3));
          setObjectPosition(objectPos);
        }
        return updatedSatellites;
      });
    };
      return () => ws.close();
    }, []);

  
  const handleConfigChange = (e) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  const handleConfigSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:4001/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!response.ok) throw new Error('Щось пішло не так');
      console.log('Параметри змінено успішно');
    } catch (error) {
      console.error('Помилка під час зміни параметрів:', error);
    }
  };

  return (
    <div>
      <h2>Оновлення налаштувань GPS </h2>
      <form onSubmit={handleConfigSubmit}>
        <label>
          Розмір зони емуляції:
          <input type="number" name="emulationZoneSize" value={config.emulationZoneSize} onChange={handleConfigChange} />
        </label>
        <br /><br/>
        <label>
          Частота повідомлень (в секунду):
          <input type="number" name="messageFrequency" value={config.messageFrequency} onChange={handleConfigChange} />
        </label>
        <br /><br/>
        <label>
          Швидкість супутників (км/год):
          <input type="number" name="satelliteSpeed" value={config.satelliteSpeed} onChange={handleConfigChange} />
        </label>
        <br /><br/>
        <label>
          Швидкість об'єкта (км/год):
          <input type="number" name="objectSpeed" value={config.objectSpeed} onChange={handleConfigChange} />
        </label>
        <br /><br/>
        <button type="submit">Оновити налаштування</button>
      </form>

      <Plot
        data={[
          {
            x: satellites.map(s => s.x ),
            y: satellites.map(s => s.y),
            mode: 'markers',
            marker: { color: 'blue', size: 12 },
            name: 'Супутники',
          },
          {
            x: [objectPosition.x],
            y: [objectPosition.y ],
            mode: 'markers',
            marker: { color: 'red', size: 12 },
            name: 'Об\'єкт',
          },
        ]}
        layout={{
          title: 'Положення об\'єкта та супутників',
          xaxis: { title: 'X координата' },
          yaxis: { title: 'Y координата' },
          showlegend: true,
        }}
      />
    </div>
  );
};

export default GPS;

