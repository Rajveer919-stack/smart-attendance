// Har device ki ek pakki ID. Ek device se ek session me ek hi attendance lagegi
export function getDeviceId() {
  try {
    let id = localStorage.getItem('deviceId');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('deviceId', id);
    }
    return id;
  } catch {
    return 'no-storage-' + Math.random().toString(36).slice(2);
  }
}

// Phone ki location. Na mile to null
export function getPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
    );
  });
}