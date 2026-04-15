import { Router } from 'express';
import { verifyWebhook, handleWebhook } from '../controllers/webhook.controller.js';
import { webhookValidator } from '../middleware/webhookValidator.js';

const router = Router();

// GET /webhook — Meta verification challenge
router.get('/', verifyWebhook);

// POST /webhook — incoming messages (signature validated by middleware)
router.post('/', webhookValidator, handleWebhook);

export default router;
