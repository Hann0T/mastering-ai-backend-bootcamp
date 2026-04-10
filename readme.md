# DocuChat API

Simple REST API built with Express and Prisma.

## Setup

Clone the repo and install dependencies:

```bash
git clone https://github.com/Hann0T/mastering-ai-backend-bootcamp.git
cd mastering-ai-backend-bootcamp
npm install
```

## Environment

Copy the example env file:

```bash
cp .env.example .env
cp .env.example .env.test
```
### Secrets:
Generate secure random secrets using Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use the output values in the .env file:
```bash
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
```

### Database:
You can use SQLite with a local file:

```bash
DATABASE_URL="file:./dev.db"
```

For tests, use a separate database file:

```bash
DATABASE_URL="file:./test.db"
```

## Database

Run migrations:

```bash
npx prisma migrate dev
```

For the testing database:

```bash
npx dotenv -e .env.test -- prisma migrate deploy
```

Generate the client:

```bash
npx prisma generate
```

Run the seeder (if needed):

```bash
npx prisma db seed
```

## Run the app

```bash
npm run dev
```

## Run tests

```bash
npm run test
```