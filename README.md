# Portfolio Platform
Zharkenova Tolkyn, BDA-2305
___
This project is a Portfolio Platform built using Node.js, EJS, and CSS. It allows users to manage portfolio items with features like image carousels, role-based access control, two-factor authentication (2FA), and email notifications via Nodemailer.

#### Features
* User Authentication: Users can register, log in, and manage their portfolios.
* Role-Based Access Control: Admins can delete and post portfolio items, while editors can only create new items.
* Two-Factor Authentication (2FA): Added extra security during login by requiring a verification code.
* Email Notifications with Nodemailer: Sends a confirmation email to users upon successful registration.
* Portfolio Management: Users can create, view, and manage portfolio items, including adding images and descriptions.
* Data Visualization: Displays charts based on dynamic data, such as news analytics and heaviest cat breeds.

## Setup Instructions
Prerequisites
* Node.js
* MongoDB Atlas or local MongoDB instance
* A valid email account (for Nodemailer)

__Installation Steps__
1. Clone the repository:
```
git clone https://github.com/tolkyn230700/Final-Backend.git
cd portfolio-platform
```
2. Install dependencies:

```
npm install
```
3. Set up environment variables:

Create a .env file in the root of the project.
Add the following variables:
.env
```
MONGODB_URL=mongodb+srv://zarkenovatolkyn:230700tolkyn@cluster0.h41d9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
SESSION_SECRET=KiraIsTheBest
PORT=3000
JWT_SECRET=IloveKiraCatMeow
EMAIL_USER=anatolymarattzr@gmail.com
EMAIL_PASSWORD=sltj nnrq dtjf ltrp

CAT_API_KEY=live_AWZHzyv13Xk0e9BCuj8oFXY9J6QndUTVr1vR2MkEyQg4GJ1yLumxhKgI6vx5GAKL
NEWS_API_KEY=6a523ad55121432faa05eef495551e93
```
4. Start the application:

```
npm start
```
The server will start on http://localhost:3000.


### API Usage
This project integrates with several external APIs:

1. News API:
Fetches news data for analysis and displays it on the news analytics page.
Endpoint: /api/news
Filters:
Filter data according to specific options(articles' genres) in specific period of time(user has to set the start and end dates, however the's data available only for the last 30 days)
2. The Cat API:
* Fetches random cat images to display on the cat page.
Endpoint: /api/random-cat
* Provides data on the heaviest cat breeds for display in a bar chart.
Endpoint: /api/cat-breeds


### Key Design Decisions
1. Role-Based Access Control
To ensure that only authorized users can perform certain actions (e.g., deleting portfolio items)
Admin: Can create and delete portfolio items.
User: Can only create portfolio items.
2. Two-Factor Authentication (2FA)
To enhance security, we implemented 2FA using email. After users log in with their username and password, they are sent a verification code. Only after entering the correct code can they fully access the platform.

3. Nodemailer for Email Notifications
When a user registers, they receive a confirmation email notifying them of their successful registration.

4. Responsive Design with CSS and Slick Carousel
To ensure a smooth user experience on all devices, the platform is fully responsive. Slick Carousel is used to display portfolio images in an interactive carousel.

5. Chart.js for Data Visualization
We used Chart.js to render charts dynamically based on data fetched from APIs.

6. MongoDB for Data Storage
MongoDB was chosen as the database to store user data, portfolio items, and other application-related information.

