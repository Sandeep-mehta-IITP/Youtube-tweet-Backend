# 🎥 YouTube-Tweet — Backend (Node.js + Express + MongoDB)

This repository contains the **backend API** for **YouTube-Tweet**, a full-featured video-sharing and micro-posting platform inspired by YouTube.
It handles **authentication, video management, playlists, subscriptions, and tweet-style posts** with scalable APIs and MongoDB pipelines.

---

## 🚀 Live Frontend Demo

🔗 [YouTube-Tweet Frontend](https://youtube-tweet-frontend.onrender.com/)

---

## 🛠️ Tech Stack

* **Node.js** — Backend runtime
* **Express.js** — Web framework & API routing
* **MongoDB** — Database (Aggregation pipelines, indexing, pagination)
* **Mongoose** — MongoDB ODM
* **JWT** — Authentication & authorization
* **Cloudinary** — Video and image hosting
* **Cors** — Cross-origin requests
* **dotenv** — Environment configuration

---

## 📦 Features (Backend)

### 🔐 Authentication

* User signup & login
* JWT token-based authentication
* Password hashing (bcrypt)
* Token refresh & protected routes

### 🎬 Video Management

* Upload videos (via Cloudinary)
* Fetch video feed with server-side pagination
* Individual video details
* Video aggregation for channel pages

### 📁 Playlists & Channels

* Create, update, and delete playlists
* Subscribe / unsubscribe to channels
* Fetch subscribed channels’ content

### 📝 Tweet-Style Posts

* CRUD operations for tweets
* Integration with user channels
* Aggregated feeds for combined video + tweets

### 📊 Performance & DB Optimization

* MongoDB aggregation pipelines for advanced queries
* Indexing for faster retrieval
* Server-side pagination
* Optimized queries for minimal response time

---

## 🧩 Project Structure

```
src/
│── controllers/     # Route controllers (videos, auth, playlists, tweets)
│── models/          # Mongoose schemas (User, Video, Playlist, Tweet)
│── routes/          # Express routes
│── middleware/      # Auth, error handling, validation middleware
│── utils/           # Helper functions & Cloudinary integration
│── config/          # DB connection, environment setup
│── app.js           # Express app setup
│── server.js        # Server entry point
```

---

## ⚙️ How to Run Locally

### 1️⃣ Clone the repository

```bash
git clone https://github.com/Sandeep-mehta-IITP/Youtube-tweet-Backend
cd Youtube-tweet-Backend
```

### 2️⃣ Install dependencies

```bash
npm install
```

### 3️⃣ Create `.env` file at project root

```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 4️⃣ Start the development server

```bash
npm run dev
```

Server will run on:
👉 [http://localhost:5000](http://localhost:8000)

---

## 🧠 Architecture & Design Decisions

* **Modular structure:** Routes, controllers, and middleware separated for scalability
* **JWT auth** for stateless, secure sessions
* **MongoDB pipelines** used for aggregated feeds & subscriptions
* **Error handling middleware** ensures consistent API responses
* **Cloudinary integration** abstracts media upload logic

---

## 🐞 Error Handling & Edge Cases

* Duplicate email / username validation
* Invalid JWT or token expiration
* Video or playlist not found
* Cloudinary upload failure handling
* Input validation with descriptive error messages

---

## 📦 Production-Ready Improvements

* Pagination & filtering for large datasets
* Indexing & aggregation for performance
* Secure JWT token storage
* Environment-based configuration (dev/prod)
* API versioning ready for future extensions

---

## 🔗 Repositories

**Frontend Repo:**
[https://github.com/Sandeep-mehta-IITP/Youtube-tweet-frontend](https://github.com/Sandeep-mehta-IITP/Youtube-tweet-frontend)

**Backend Repo:**
[https://github.com/Sandeep-mehta-IITP/Youtube-tweet-Backend](https://github.com/Sandeep-mehta-IITP/Youtube-tweet-Backend)

---

## 🤝 Contributing

Contributions, feedback, or bug reports are welcome.
Please open an issue or submit a pull request!

---

## ⭐ Show Your Support

If you find this project useful, consider starring the repository! 🚀

---

## 👨‍💻 Author

**Sandeep Mehta (Shiv)**
MERN Stack Developer | Software Engineering Student
