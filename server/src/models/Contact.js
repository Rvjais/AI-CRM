import mongoose from 'mongoose';
import contactSchema from '../schemas/Contact.schema.js';

const Contact = mongoose.model('Contact', contactSchema);

export default Contact;

