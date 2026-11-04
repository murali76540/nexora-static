/**
 * NEXORA Real-time Notifications & Problem Disruption Alerts
 * E.G.S. Pillay Engineering College
 */

const NotificationsManager = {
  unreadCount: 0,
  notifications: [],

  init: () => {
    NotificationsManager.fetchNotifications();
    // Poll for real-time updates every 8 seconds
    setInterval(NotificationsManager.fetchNotifications, 8000);
  },

  fetchNotifications: async () => {
    const user = NexoraAPI.getUser();
    if (!user) return;

    try {
      const res = await NexoraAPI.request('/competitions');
      const compsWithDisruption = (res.competitions || []).filter(c => c.currentVersion === '2.0');

      if (compsWithDisruption.length > 0) {
        const badge = document.getElementById('notifBadge');
        if (badge) {
          badge.textContent = compsWithDisruption.length;
          badge.style.display = 'inline-block';
        }
      }
    } catch (e) {
      // Background poll silently handles errors
    }
  },

  showDisruptionBanner: (compTitle, disruptionStatement) => {
    const banner = document.getElementById('disruptionAlertBanner');
    if (banner) {
      banner.style.display = 'block';
      const text = document.getElementById('disruptionAlertText');
      if (text) {
        text.innerHTML = `<strong>CRITICAL DISRUPTION RELEASED for ${compTitle}:</strong> ${disruptionStatement}`;
      }
    }
  }
};

document.addEventListener('DOMContentLoaded', NotificationsManager.init);
window.NotificationsManager = NotificationsManager;
