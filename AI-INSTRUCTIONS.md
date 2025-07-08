# AI-INSTRUCTIONS.md

This document provides comprehensive guidelines for AI agents (Claude, GPT, etc.) contributing to the AI D&D Platform development.

## 🎯 Project Mission

Create an immersive, AI-powered Dungeons & Dragons platform that seamlessly blends human creativity with AI assistance. The platform should feel natural, engaging, and accessible to both D&D veterans and newcomers.

## 🏗️ Architecture Principles

### Core Design Philosophy
- **AI-First**: Every feature should consider AI integration from the start
- **Modular AI**: AI agents should be composable and replaceable
- **Human-Centric**: AI enhances human experience, never replaces human agency
- **Cross-Platform**: Universal experience across mobile, web, and future desktop

### AI Agent Architecture
```
AI Agent Hierarchy:
├── Dungeon Master (DM-AI)
│   ├── Story Generation
│   ├── Rule Enforcement
│   ├── NPC Management
│   └── World State Management
├── Player Characters (PC-AI)
│   ├── Personality Simulation
│   ├── Decision Making
│   ├── Character Development
│   └── Party Interaction
├── NPCs (NPC-AI)
│   ├── Dialogue Generation
│   ├── Behavior Patterns
│   ├── Voice Synthesis
│   └── Relationship Management
└── Rule Advisor (RA-AI)
    ├── Rule Lookup
    ├── Spell/Ability Checking
    ├── Combat Resolution
    └── Character Sheet Management
```

## 🛠️ Development Guidelines

### Code Organization
```
services/
├── ai/
│   ├── agents/          # AI agent implementations
│   ├── prompts/         # Prompt templates and management
│   ├── voice/           # Resemble.ai integration
│   ├── images/          # Flux.dev integration
│   └── providers/       # AI service providers (OpenAI, Anthropic)
├── game/
│   ├── rules/           # D&D rule engine
│   ├── state/           # Game state management
│   ├── dice/            # Dice rolling and probability
│   └── combat/          # Combat mechanics
├── multiplayer/
│   ├── rooms/           # Game room management
│   ├── sync/            # State synchronization
│   └── communication/   # Real-time messaging
└── storage/
    ├── characters/      # Character persistence
    ├── campaigns/       # Campaign data
    └── settings/        # User preferences
```

### TypeScript Conventions
```typescript
// AI Agent Interface
interface AIAgent {
  id: string;
  type: 'dm' | 'pc' | 'npc' | 'advisor';
  personality: PersonalityTraits;
  context: GameContext;
  respond(input: string): Promise<AIResponse>;
  updateContext(context: Partial<GameContext>): void;
}

// Game State Management
interface GameState {
  session: GameSession;
  characters: Character[];
  world: WorldState;
  history: GameEvent[];
}

// AI Response Types
interface AIResponse {
  text: string;
  actions?: GameAction[];
  voiceUrl?: string;
  imageUrl?: string;
  metadata: ResponseMetadata;
}
```

## 🎭 AI Agent Implementation

### Dungeon Master AI
**Purpose**: Primary game facilitator and storyteller
**Key Responsibilities**:
- Generate engaging narrative content
- Manage NPCs and world events
- Enforce D&D rules fairly
- Adapt to player choices dynamically

**Implementation Guidelines**:
- Use context-aware prompt engineering
- Maintain story consistency across sessions
- Balance challenge and fun
- Provide clear, actionable descriptions

**Example Prompt Structure**:
```
You are an experienced Dungeon Master running a D&D 5e campaign.
Current Context: {gameState}
Player Action: {playerInput}
Character Sheets: {characters}
World State: {worldState}

Respond with engaging narrative that:
1. Acknowledges the player's action
2. Describes the immediate consequence
3. Sets up the next decision point
4. Maintains consistent tone and world rules
```

### Player Character AI
**Purpose**: AI companions for solo play or party filling
**Key Responsibilities**:
- Maintain consistent character personality
- Make strategic combat decisions
- Contribute to roleplay scenarios
- Support human players' narratives

**Implementation Guidelines**:
- Each PC-AI should have distinct personality traits
- Use character backstory to inform decisions
- Avoid overshadowing human players
- Provide tactical variety in combat

### NPC AI
**Purpose**: Bring the world to life with interactive characters
**Key Responsibilities**:
- Generate contextual dialogue
- Maintain relationship dynamics
- Provide quest information appropriately
- React to player reputation and actions

**Implementation Guidelines**:
- Use voice synthesis for immersion
- Maintain NPC memory of past interactions
- Vary speech patterns and vocabulary
- Create believable motivations

### Rule Advisor AI
**Purpose**: Help with D&D rules and mechanics
**Key Responsibilities**:
- Provide rule clarifications
- Calculate complex interactions
- Suggest optimal strategies
- Resolve disputes fairly

**Implementation Guidelines**:
- Reference official D&D 5e rules
- Explain reasoning behind rulings
- Offer alternative interpretations
- Maintain game balance

## 🎨 Media Integration

### Voice Synthesis (Resemble.ai)
- Create distinct voices for each character type
- Maintain voice consistency across sessions
- Handle different emotional states
- Optimize for mobile playback

### Image Generation (Flux.dev)
- Generate character portraits
- Create scene illustrations
- Design items and equipment
- Maintain consistent art style

### Implementation Pattern:
```typescript
// Voice Integration
const voiceService = new ResembleAIService();
const npcVoice = await voiceService.generateSpeech({
  text: dialogue,
  voiceId: npc.voiceId,
  emotion: npc.currentEmotion
});

// Image Integration
const imageService = new FluxDevService();
const characterImage = await imageService.generateImage({
  prompt: `D&D character: ${character.description}`,
  style: 'fantasy-art',
  aspect: '1:1'
});
```

## 🔄 State Management

### Game State Architecture
- **Immutable State**: Use Redux Toolkit for predictable state updates
- **Real-time Sync**: WebSocket integration for multiplayer
- **Persistence**: Local storage with cloud backup
- **Optimistic Updates**: Immediate UI feedback with rollback capability

### AI Context Management
- **Session Memory**: Maintain conversation context
- **Long-term Memory**: Store character relationships and world changes
- **Context Windowing**: Manage token limits efficiently
- **State Snapshots**: Enable save/load functionality

## 🧪 Testing Strategy

### AI Testing Approaches
- **Unit Tests**: Test individual AI agent responses
- **Integration Tests**: Test AI service interactions
- **Scenario Tests**: Test complete gameplay scenarios
- **Performance Tests**: Test response times and resource usage

### Testing Framework:
```typescript
describe('DungeonMasterAI', () => {
  it('should generate appropriate responses to player actions', async () => {
    const dm = new DungeonMasterAI();
    const response = await dm.respond('I attack the goblin');
    expect(response.text).toContain('roll for attack');
    expect(response.actions).toHaveLength(1);
  });
});
```

## 🚀 Performance Optimization

### AI Response Optimization
- **Caching**: Cache common responses and generated content
- **Streaming**: Stream long responses for better UX
- **Preprocessing**: Prepare context in advance
- **Parallel Processing**: Handle multiple AI requests concurrently

### Resource Management
- **Token Budgets**: Monitor and optimize AI service usage
- **Image Caching**: Store generated images locally
- **Voice Caching**: Cache frequently used voice clips
- **Memory Management**: Clear old context appropriately

## 🔒 Security & Privacy

### AI Safety
- **Content Filtering**: Prevent inappropriate content generation
- **Bias Mitigation**: Ensure fair representation in AI responses
- **Data Protection**: Secure storage of user conversations
- **Rate Limiting**: Prevent abuse of AI services

### API Security
- **Key Management**: Secure storage of API keys
- **Request Validation**: Validate all AI service requests
- **Error Handling**: Graceful handling of AI service failures
- **Logging**: Comprehensive logging for debugging

## 📈 Analytics & Monitoring

### AI Performance Metrics
- **Response Quality**: User satisfaction ratings
- **Response Time**: Average AI response latency
- **Context Accuracy**: Measure context understanding
- **Engagement**: Track user interaction patterns

### Monitoring Implementation:
```typescript
const aiMetrics = {
  responseTime: measureResponseTime(),
  contextAccuracy: evaluateContextUse(),
  userSatisfaction: collectUserFeedback(),
  errorRate: trackAIErrors()
};
```

## 🎯 Development Priorities

### Phase 1: Core AI Foundation
1. Basic DM AI with simple responses
2. Rule lookup and basic mechanics
3. Character sheet integration
4. Simple NPC interactions

### Phase 2: Enhanced AI Features
1. Voice synthesis integration
2. Image generation for characters
3. Advanced conversation memory
4. Multi-turn dialogue support

### Phase 3: Advanced AI Capabilities
1. Dynamic story generation
2. Complex NPC relationships
3. Adaptive difficulty adjustment
4. Cross-session continuity

### Phase 4: Polish & Optimization
1. Performance optimization
2. Advanced caching strategies
3. Enhanced error handling
4. Comprehensive testing

## 🤝 Collaboration Guidelines

### AI Agent Coordination
- **Shared Context**: Ensure all AI agents have access to current game state
- **Conflict Resolution**: Define priority when AI agents disagree
- **Handoff Protocols**: Smooth transitions between AI agent types
- **Consistency Checks**: Validate AI responses for consistency

### Human-AI Collaboration
- **Transparency**: Make AI decision-making process clear
- **Override Capability**: Allow human players to override AI decisions
- **Feedback Integration**: Learn from human corrections
- **Agency Preservation**: Maintain human player agency

## 📚 Resources & References

### D&D 5e Resources
- [D&D 5e Basic Rules](https://dnd.wizards.com/articles/features/basicrules)
- [D&D 5e SRD](https://dnd.wizards.com/resources/systems-reference-document)
- [DM's Guild](https://www.dmsguild.com/) for additional content

### AI Development Resources
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Anthropic API Documentation](https://docs.anthropic.com/)
- [Resemble.ai Documentation](https://docs.resemble.ai/)
- [Flux.dev Documentation](https://docs.flux.dev/)

### React Native & Expo Resources
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 🔧 Development Tools

### Recommended VS Code Extensions
- **ES7+ React/Redux/React-Native snippets**
- **TypeScript Hero**
- **Expo Tools**
- **ESLint**
- **Prettier**

### Testing Tools
- **Jest** for unit testing
- **React Native Testing Library** for component testing
- **Detox** for E2E testing
- **Storybook** for component documentation

---

*This document should be regularly updated as the project evolves. All AI agents should familiarize themselves with these guidelines before contributing to the codebase.*