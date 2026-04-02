// src/express.d.ts
import { User } from '@prisma/client'; // Adjust according to your user model import

declare global {
  namespace Express {
    interface Request {
      user?: User; // Add the user property to the Request type, replace `User` with your actual type
    }
  }
}
