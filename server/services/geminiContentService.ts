import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "../db.js";
import { contentChatSessions, contentPieces, seoKeywords } from "../../shared/schema.js";
import { eq, and } from "drizzle-orm";

export class GeminiContentService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  }

  // Start a new content chat session
  async startContentSession(
    userId: string,
    contentPieceId?: number,
    sessionType: string = "content_creation",
    context: any = {}
  ) {
    const [session] = await db
      .insert(contentChatSessions)
      .values({
        userId,
        contentPieceId,
        sessionType,
        context,
        messages: [],
      })
      .returning();

    return session;
  }

  // Get existing chat session
  async getChatSession(sessionId: number, userId: string) {
    const [session] = await db
      .select()
      .from(contentChatSessions)
      .where(
        and(
          eq(contentChatSessions.id, sessionId),
          eq(contentChatSessions.userId, userId)
        )
      )
      .limit(1);

    return session;
  }

  // Generate content with SEO optimization
  async generateSEOContent(
    title: string,
    contentType: "blog" | "page" | "service",
    keywords: string[],
    targetAudience: string,
    contentLength: "short" | "medium" | "long" = "medium",
    tone: "professional" | "friendly" | "authoritative" | "conversational" = "professional",
    spyfuData?: any
  ) {
    const lengthGuide = {
      short: "300-500 words",
      medium: "800-1200 words", 
      long: "1500-2500 words"
    };

    const prompt = this.buildSEOContentPrompt({
      title,
      contentType,
      keywords,
      targetAudience,
      contentLength: lengthGuide[contentLength],
      tone,
      spyfuData
    });

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("Error generating SEO content:", error);
      throw new Error("Failed to generate content");
    }
  }

  // Rewrite existing content with SEO improvements
  async rewriteContentForSEO(
    originalContent: string,
    targetKeywords: string[],
    improvements: string[] = [],
    spyfuInsights?: any
  ) {
    const prompt = `You are an expert SEO content writer. Please rewrite the following content to improve its SEO performance while maintaining its core message and value.

ORIGINAL CONTENT:
${originalContent}

TARGET KEYWORDS TO NATURALLY INTEGRATE:
${targetKeywords.join(", ")}

SPECIFIC IMPROVEMENTS REQUESTED:
${improvements.length > 0 ? improvements.join("\n- ") : "General SEO optimization"}

${spyfuInsights ? `
COMPETITIVE INSIGHTS (from SpyFu analysis):
${JSON.stringify(spyfuInsights, null, 2)}
` : ""}

REQUIREMENTS:
1. Maintain the original tone and key messages
2. Naturally integrate target keywords without keyword stuffing
3. Improve readability and structure
4. Add semantic keywords and related terms
5. Optimize for user intent and search engines
6. Keep the content engaging and valuable

Please provide the rewritten content in markdown format:`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("Error rewriting content:", error);
      throw new Error("Failed to rewrite content");
    }
  }

  // Chat-based content assistance
  async chatWithGemini(
    sessionId: number,
    userMessage: string,
    userId: string,
    context: any = {}
  ) {
    // Get existing session
    const session = await this.getChatSession(sessionId, userId);
    if (!session) {
      throw new Error("Chat session not found");
    }

    // Build conversation context
    const conversationHistory = Array.isArray(session.messages) ? session.messages : [];
    
    // Add system context for content creation
    const systemPrompt = this.buildSystemPrompt(session.sessionType, context);
    
    // Build full conversation for context
    const fullConversation = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: userMessage }
    ];

    try {
      // Generate response
      const prompt = this.buildChatPrompt(fullConversation, context);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const assistantMessage = response.text();

      // Update session with new messages
      const updatedMessages = [
        ...conversationHistory,
        { role: "user", content: userMessage, timestamp: new Date().toISOString() },
        { role: "assistant", content: assistantMessage, timestamp: new Date().toISOString() }
      ];

      await db
        .update(contentChatSessions)
        .set({
          messages: updatedMessages,
          updatedAt: new Date()
        })
        .where(eq(contentChatSessions.id, sessionId));

      return {
        message: assistantMessage,
        sessionId,
        suggestions: this.extractSuggestions(assistantMessage)
      };
    } catch (error) {
      console.error("Error in Gemini chat:", error);
      throw new Error("Failed to process chat message");
    }
  }

  // Generate Hugo frontmatter
  async generateHugoFrontmatter(
    title: string,
    content: string,
    contentType: "blog" | "page" | "service",
    keywords: string[] = [],
    customFields: any = {}
  ) {
    const prompt = `Generate appropriate Hugo frontmatter for the following content:

TITLE: ${title}
CONTENT TYPE: ${contentType}
TARGET KEYWORDS: ${keywords.join(", ")}

CONTENT PREVIEW:
${content.substring(0, 500)}...

Generate YAML frontmatter that includes:
1. title, description, slug
2. date, publishDate (use current date)
3. SEO-optimized meta description (150-160 characters)
4. relevant tags and categories
5. featured image suggestions
6. schema.org structured data where appropriate

Additional fields requested:
${Object.keys(customFields).length > 0 ? JSON.stringify(customFields, null, 2) : "None"}

Return only the YAML frontmatter (without the --- delimiters):`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("Error generating frontmatter:", error);
      throw new Error("Failed to generate frontmatter");
    }
  }

  // Build SEO-focused content prompt
  private buildSEOContentPrompt(params: {
    title: string;
    contentType: string;
    keywords: string[];
    targetAudience: string;
    contentLength: string;
    tone: string;
    spyfuData?: any;
  }) {
    return `You are an expert SEO content writer specializing in ${params.contentType} content. Create comprehensive, engaging content that ranks well in search engines.

CONTENT BRIEF:
- Title: ${params.title}
- Content Type: ${params.contentType}
- Target Length: ${params.contentLength}
- Tone: ${params.tone}
- Target Audience: ${params.targetAudience}

PRIMARY KEYWORDS TO TARGET:
${params.keywords.join(", ")}

${params.spyfuData ? `
COMPETITIVE INSIGHTS:
${JSON.stringify(params.spyfuData, null, 2)}
` : ""}

CONTENT REQUIREMENTS:
1. Create a compelling headline and introduction
2. Naturally integrate target keywords throughout
3. Use semantic keywords and related terms
4. Structure with clear headers (H2, H3) for readability
5. Include actionable insights and value for readers
6. Optimize for featured snippets where possible
7. Write meta description (150-160 characters)
8. Suggest internal linking opportunities

OUTPUT FORMAT:
Provide the content in markdown format with:
- Clear heading structure
- Natural keyword integration
- Engaging and informative content
- Meta description suggestion at the end

Content:`;
  }

  // Build system prompt for chat sessions
  private buildSystemPrompt(sessionType: string, context: any = {}) {
    const basePrompt = "You are an expert content strategist and SEO specialist helping users create high-quality, search-optimized content.";
    
    switch (sessionType) {
      case "content_creation":
        return `${basePrompt} You help brainstorm ideas, structure content, and optimize for search engines. Be creative, practical, and focused on results.`;
      
      case "seo_optimization":
        return `${basePrompt} You specialize in improving existing content for better search rankings. Analyze content gaps, keyword opportunities, and provide specific optimization recommendations.`;
      
      case "rewrite":
        return `${basePrompt} You excel at rewriting content to improve clarity, engagement, and SEO performance while preserving the original message and tone.`;
      
      default:
        return basePrompt;
    }
  }

  // Build chat prompt with context
  private buildChatPrompt(conversation: any[], context: any = {}) {
    let prompt = "";
    
    conversation.forEach(msg => {
      if (msg.role === "system") {
        prompt += `SYSTEM: ${msg.content}\n\n`;
      } else if (msg.role === "user") {
        prompt += `USER: ${msg.content}\n\n`;
      } else if (msg.role === "assistant") {
        prompt += `ASSISTANT: ${msg.content}\n\n`;
      }
    });

    if (context.spyfuData) {
      prompt += `\nAVAILABLE CONTEXT:\nSpyFu Analysis: ${JSON.stringify(context.spyfuData, null, 2)}\n\n`;
    }

    prompt += "Please provide a helpful, actionable response:";
    
    return prompt;
  }

  // Extract actionable suggestions from AI response
  private extractSuggestions(response: string): string[] {
    const suggestions: string[] = [];
    
    // Look for common suggestion patterns
    const patterns = [
      /consider\s+([^.]+)/gi,
      /try\s+([^.]+)/gi,
      /you\s+could\s+([^.]+)/gi,
      /i\s+recommend\s+([^.]+)/gi,
      /suggestion:\s*([^.]+)/gi
    ];
    
    patterns.forEach(pattern => {
      const matches = response.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const cleaned = match.replace(/^(consider|try|you could|i recommend|suggestion:)\s*/i, "").trim();
          if (cleaned.length > 10 && cleaned.length < 100) {
            suggestions.push(cleaned);
          }
        });
      }
    });
    
    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }
}