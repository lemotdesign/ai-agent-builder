import { Router } from 'express';
import ModelConfigService from '../services/modelConfigService';

const router = Router();

// Test endpoint to verify model configurations
router.get('/test-models', async (req, res) => {
  try {
    const models = ModelConfigService.getModelConfigurations();
    const modelList = Object.keys(models).map(key => ({
      id: key,
      name: models[key].modelName,
      description: models[key].description,
      pricing: models[key].pricing,
      capabilities: models[key].capabilities,
      contextWindow: models[key].contextWindow,
      isRecommended: models[key].isRecommended || false
    }));

    res.json({
      success: true,
      models: modelList,
      totalModels: modelList.length,
      recommendedModels: modelList.filter(m => m.isRecommended)
    });
  } catch (error) {
    console.error('Error fetching model configurations:', error);
    res.status(500).json({ error: 'Failed to fetch model configurations' });
  }
});

// Test a specific model with a simple prompt
router.post('/test-model/:modelId', async (req, res) => {
  try {
    const { modelId } = req.params;
    const { message = "Hello, can you confirm you're working correctly?" } = req.body;

    const { client, modelName } = ModelConfigService.selectClientAndModel(modelId);
    
    // Configure parameters based on model type
    const isGPT5 = modelName.startsWith('gpt-5');
    const completionParams: any = {
      model: modelName,
      messages: [
        {
          role: "system",
          content: `You are testing the ${modelName} model. Respond briefly confirming the model is working and mention your capabilities.`
        },
        {
          role: "user",
          content: message
        }
      ]
    };

    // Model-specific parameter handling
    if (isGPT5) {
      // GPT-5 specific requirements
      completionParams.max_completion_tokens = 150;
      // GPT-5 only supports temperature: 1 (default), don't set temperature parameter
    } else {
      // Grok and other models
      completionParams.max_tokens = 150;
      completionParams.temperature = 0.7;
    }

    const response = await client.chat.completions.create(completionParams);

    res.json({
      success: true,
      modelId,
      modelName,
      testMessage: message,
      response: response.choices[0].message.content,
      usage: response.usage
    });
  } catch (error) {
    console.error(`Error testing model ${req.params.modelId}:`, error);
    res.status(500).json({ 
      error: `Failed to test model ${req.params.modelId}`,
      details: error.message
    });
  }
});

export default router;