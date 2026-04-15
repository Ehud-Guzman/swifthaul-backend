const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'SwiftHaul <noreply@swifthaul.com>',
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('Email send failed:', err.message);
  }
};

// --- Templates ---

const jobAssignedEmail = (recipientName, job) => ({
  subject: 'SwiftHaul — Job Assigned',
  html: `
    <h2>Hello ${recipientName},</h2>
    <p>Job <strong>#${job._id}</strong> has been assigned.</p>
    <p><strong>Pickup:</strong> ${job.pickup_location}</p>
    <p><strong>Drop-off:</strong> ${job.dropoff_location}</p>
    <p><strong>Preferred date:</strong> ${new Date(job.preferred_date).toDateString()}</p>
    <br/><p>— SwiftHaul Logistics</p>
  `,
});

const jobPickedUpEmail = (clientName, job) => ({
  subject: 'SwiftHaul — Your Cargo Has Been Picked Up',
  html: `
    <h2>Hello ${clientName},</h2>
    <p>Your cargo for job <strong>#${job._id}</strong> has been picked up and is on the way.</p>
    <br/><p>— SwiftHaul Logistics</p>
  `,
});

const jobDeliveredEmail = (recipientName, job) => ({
  subject: 'SwiftHaul — Job Delivered',
  html: `
    <h2>Hello ${recipientName},</h2>
    <p>Job <strong>#${job._id}</strong> has been delivered successfully.</p>
    <p><strong>Route:</strong> ${job.pickup_location} → ${job.dropoff_location}</p>
    <br/><p>— SwiftHaul Logistics</p>
  `,
});

const jobCancelledEmail = (recipientName, job) => ({
  subject: 'SwiftHaul — Job Cancelled',
  html: `
    <h2>Hello ${recipientName},</h2>
    <p>Job <strong>#${job._id}</strong> has been cancelled.</p>
    <p><strong>Route:</strong> ${job.pickup_location} → ${job.dropoff_location}</p>
    <p><strong>Preferred date:</strong> ${new Date(job.preferred_date).toDateString()}</p>
    <br/><p>— SwiftHaul Logistics</p>
  `,
});

const newJobRequestEmail = (adminName, job) => ({
  subject: 'SwiftHaul — New Job Request',
  html: `
    <h2>Hello ${adminName},</h2>
    <p>A new job request has been submitted and is awaiting assignment.</p>
    <p><strong>Cargo:</strong> ${job.cargo_type} — ${job.weight_kg} kg</p>
    <p><strong>Route:</strong> ${job.pickup_location} → ${job.dropoff_location}</p>
    <p><strong>Preferred date:</strong> ${new Date(job.preferred_date).toDateString()}</p>
    <br/><p>— SwiftHaul Logistics</p>
  `,
});

module.exports = {
  sendEmail,
  jobAssignedEmail,
  jobPickedUpEmail,
  jobDeliveredEmail,
  jobCancelledEmail,
  newJobRequestEmail,
};
