importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDu8e76eUQnaCiETaeh-af2hQtVg9vnUWo",
  authDomain: "taskmanager-4b024.firebaseapp.com",
  projectId: "taskmanager-4b024",
  storageBucket: "taskmanager-4b024.firebasestorage.app",
  messagingSenderId: "536356281424",
  appId: "1:536356281424:web:4324c9101f775b9b664555",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "Expense Tracker";
  const options = {
    body: payload.notification?.body,
    icon: "/icons/icon-192.png",
  };

  self.registration.showNotification(title, options);
});
