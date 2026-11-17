# Personal Portfolio Website

A responsive full-stack portfolio built with HTML, CSS, JavaScript, Node.js, Express and MongoDB.

## Features
- Responsive portfolio page (About, Skills, Projects and Contact)
- Projects are loaded from MongoDB through the Express API
- Contact form saves messages to MongoDB
- Session-protected admin dashboard for managing projects and viewing contact messages
- Admin login, activity heartbeat, idle timeout and absolute session timeout
- Technology filters, featured project cards and responsive mobile navigation

## 1. Requirements
Install:
- Node.js (LTS): https://nodejs.org/
- A MongoDB database. MongoDB Atlas free tier: https://www.mongodb.com/atlas

## 2. Setup
Open this project folder in VS Code or a terminal.

```bash
npm install
```

Copy `.env.example` to a new file named `.env`, then update the values:

```env
PORT=3000
MONGODB_URI=your_mongodb_atlas_connection_string
ADMIN_PASSWORD=your_long_unique_admin_password
SESSION_SECRET=your_long_random_session_secret
```

In MongoDB Atlas, create a database user and allow your computer's IP address in Network Access. Copy the connection string and replace its username, password and database name as needed. Do not share your `.env` file or upload it to GitHub.

## 3. Run the website

```bash
npm run dev
```

Open this address in your browser:

http://localhost:3000

Use `npm start` for normal running.

## 4. Add a project

Sign in at `http://localhost:3000/admin` using the `ADMIN_PASSWORD` value. The admin dashboard uses the secure server-side session cookie for project management.

Example JSON body:

```json
{
  "title": "Cybersecurity Dashboard",
  "description": "A dashboard that brings useful security checks together in one place.",
  "tech": ["Python", "HTML", "CSS", "JavaScript"],
  "link": "",
  "github": "https://github.com/yourusername/your-repository",
  "featured": true
}
```

Use the dashboard form to add projects. The admin session is maintained by the server; do not put administrator credentials in frontend code.
Other admin endpoints:
- `PUT /api/projects/:id` — update a project (admin session required)
- `DELETE /api/projects/:id` — delete a project (admin session required)
- `GET /api/messages` — view contact messages (admin session required)

The public website uses `GET /api/projects` and `POST /api/contact`.

## 5. Personalise the website
Edit `public/index.html`:
- Replace `Your Name` with your name.
- Update the logo initials (`YN`).
- Change your introduction, location, skills and email.
- Add your real project links after uploading projects.

Edit `public/style.css` to change colours and layout.

## 6. Deploy
One simple option is Render:
1. Push the project to a GitHub repository (do not push `.env`).
2. Create a new **Web Service** on https://render.com and connect the repository.
3. Build command: `npm install`
4. Start command: `npm start`
5. Add `MONGODB_URI`, `ADMIN_PASSWORD` and `SESSION_SECRET` under the service's Environment settings.
6. Deploy. Render provides a public URL.

Keep the MongoDB Atlas database available to the deployed service. Configure Atlas Network Access according to the hosting provider's current guidance. Never expose the administrator password or session secret in frontend JavaScript.

## API summary

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/projects` | List projects |
| POST | `/api/projects` | Add project (admin session required) |
| PUT | `/api/projects/:id` | Edit project (admin session required) |
| DELETE | `/api/projects/:id` | Delete project (admin session required) |
| POST | `/api/contact` | Save contact message |
| GET | `/api/messages` | Read messages (admin session required) |
