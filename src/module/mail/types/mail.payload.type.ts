// Define the required payload for the student activation email
interface StudentActivationPayload {
  to: string;
  studentId: string;
  tempPassword: string;
  activationLink: string;
  institutionName: string;
}
