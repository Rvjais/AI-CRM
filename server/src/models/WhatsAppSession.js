import mongoose from 'mongoose';
import whatsappSessionSchema from '../schemas/WhatsAppSession.schema.js';

const WhatsAppSession = mongoose.model('WhatsAppSession', whatsappSessionSchema);

export default WhatsAppSession;

