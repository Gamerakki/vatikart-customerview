importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initialize Firebase App inside Service Worker
firebase.initializeApp({
  apiKey: "AIzaSyD7wAemrF0TliAq77B-DeaxAi3XTPUfbkE",
  authDomain: "vatikart-app.firebaseapp.com",
  projectId: "vatikart-app",
  storageBucket: "vatikart-app.firebasestorage.app",
  messagingSenderId: "95815837864",
  appId: "1:95815837864:web:4378e3939bdaafb7e5ba9d",
  measurementId: "G-49ML5NKJM7"
});

const messaging = firebase.messaging();

// Handle background notifications
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification?.title || 'VatiKart Notification';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/favicon.svg',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
