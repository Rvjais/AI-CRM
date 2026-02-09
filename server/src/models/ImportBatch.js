import mongoose from 'mongoose';
import importBatchSchema from '../schemas/ImportBatch.schema.js';

const ImportBatch = mongoose.model('ImportBatch', importBatchSchema);

export default ImportBatch;
