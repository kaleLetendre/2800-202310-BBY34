# 2800-202310-BBY34

# League of Legends Team Composition Recommender

## Description

The League of Legends Team Composition Recommender is a powerful web application that assists players in selecting the most effective team compositions for their League of Legends games. By leveraging a comprehensive dataset containing high level match data, the app analyzes and compares matchups to provide optimal team composition recommendations.

## Table of Contents

- [Technologies](#Technologies)
- [Installation](#installation)
- [Usage](#usage)
- [Features](#features)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Technologies

The following technologies were used in the frontend of this project:

- HTML
- CSS
- JavaScript
- EJS 3.1.9
- Bootstrap 5.3.0-alpha3

The following technologies were used in the backend of this project:

- JavaScript
- Python
- Node.js 14.0.0
- Express.js 4.18.2
- TensorFlow 4.6.0

For our database:

- MongoDB

Other dependencies:

- Axios 1.4.0
- BCrypt 5.1.0
- connect-mongo 5.0.0
- connect-mongodb-session 3.1.1
- dotenv 16.0.3
- nodemailer 6.9.2
- joi 17.9.2
- nodemon 2.0.22

## Installation

To begin working on the web app, follow these steps:

### Prerequisites

Make sure you have the following installed on your system:

1. Languages

  - HTML, CSS, JavaScript, Python

2. IDEs

  - any IDE of your choice (e.g. Visual Studio Code)

3. Database system

  - MongoDB
  - Note: You will require your own user account and have installed MongoDB. Follow the instructions here:          https://www.mongodb.com/docs/atlas/

### Instructions

1. Clone the repository

2. Install dependencies

  Navigate to the project directory:

  cd synerift

  Install the required Node.js packages:

  npm install

3. Configure environment variables

  Create a new file named .env in the project root directory. This file will store your environment variables.

  Open the .env file and add the following configuration:

  MONGODB_HOST=your_database_host
  MONGODB_USER=your_database_user
  MONGODB_PASSWORD=your_database_password
  MONGODB_DATABASE=your_database
  MONGODB_SESSION_SECRET=
  NODE_SESSION_SECRET=
  PORT=your_desired_port
  EMAIL=your_email
  EMAIL_PASSWORD=your_password
  URL=http://localhost:PORT

4. Run npm start

## Usage

1. Sign in to your account on the League of Legends Team Composition Recommender website. If you don't have an account, you can easily create one by following the registration process.
2. Once logged in, you can choose to create a new room or join an existing room where other players have gathered.
3. In the room, you will find a user-friendly interface where you can input the champions comprising the enemy team, your desired champions, and the 10 banned champions for the game.
4. Click on the desired slot to fill and type in the desired Champion name, click the 'Enter' button or press 'Enter' on the keyboard to submit.
5. Based on the analyzed data, the app generates an optimal team composition recommendation, taking into account counterpicks, synergies, and win rate probabilities. The recommendation will be displayed, showcasing the champions that are most likely to lead you to victory.
6. Explore the recommended team composition and discuss strategies with your teammates for an enhanced gaming experience. You can save the composition, share it with others, or make adjustments based on your preferences.

## Features

The League of Legends Team Composition Recommender offers a range of features to enhance your gameplay experience:

### 1. Intelligent Team Composition Recommendations

Leveraging a vast dataset of high ranked match dta, the app employs advanced algorithms to suggest the most effective team composition given your inputs. By analyzing historical data and considering the strengths and weaknesses of different champions, the recommender helps you make informed decisions for optimal team synergy.

### 2. Seamless Web Interface

The user-friendly web interface enables smooth navigation, input of champion information, and access to team composition recommendations. With its intuitive design, the app ensures a hassle-free user experience, allowing you to focus on strategizing and preparing for your games.

### 3. Data-Driven Analysis

Our AI algorithms meticulously analyze and compare over a hundred thousand matches, incorporating historical data to provide accurate and reliable recommendations.

### 4. Customizable Room Creation

Create your own room or join existing rooms, allowing you to collaborate with friends, teammates, or like-minded gamers. Custom rooms provide a platform for strategy planning, and team coordination, ensuring that the recommended team composition aligns with your specific game scenario.

## Contributing

We appreciate your interest in contributing to the League of Legends Team Composition Recommender. While we are not currently accepting external contributions, you are welcome to fork the project for personal use or further development. If you have suggestions or feedback, please feel free to reach out to us.

## License

The League of Legends Team Composition Recommender is not currently released under a specific license. For inquiries regarding licensing or usage of the codebase, please contact the project owner. All images and data assets belong to Riot Games, Inc.

## Contact

For any questions, feedback, or support, please contact the project owner:

- Name: [BBY-34] [Raghav, Greg, Mike, Kale]
- Email: [rsoni14@my.bcit.ca, jsong118@my.bcit.ca]
