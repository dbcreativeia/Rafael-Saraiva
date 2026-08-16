export const generateEventId = () => `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

export const sendCAPIEvent = async (eventName: string, eventId: string) => {
  try {
    // Tenta pegar o fbp e fbc dos cookies se existirem
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
      return undefined;
    };

    await fetch('/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventName,
        eventId,
        eventUrl: window.location.href,
        userAgent: navigator.userAgent,
        fbp: getCookie('_fbp'),
        fbc: getCookie('_fbc')
      }),
    });
  } catch (e) {
    console.warn('Erro ao enviar evento CAPI:', e);
  }
};

export const trackEvent = (eventName: string) => {
  const eventId = generateEventId();
  if (typeof window !== 'undefined') {
    if (window.fbq) {
      if (eventName === 'Lead' || eventName === 'Contact') {
        window.fbq('track', eventName, {}, { eventID: eventId });
      } else {
        window.fbq('trackCustom', eventName, {}, { eventID: eventId });
      }
    }
  }
  sendCAPIEvent(eventName, eventId);
};
