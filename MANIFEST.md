# SWORD MANIFEST
## ASCII-Blockchain-Visualizer

### Vision
SWORD is a minimalist, ASCII-based DApp for real-time visualization of blockchain activities. We combine retro aesthetics with cutting-edge technology to create a unique, performant, and accessible blockchain experience.

### Core Principles
- **100% ASCII Art**: All visual elements in ASCII art
- **Minimalism**: Reduced to the essentials, yet aesthetically pleasing
- **Mobile-First**: Optimal performance on all devices
- **Real-time**: Immediate visualization of blockchain events
- **Accessibility**: Usable for everyone, regardless of technical background
- **English-only code**: While communication may happen in German, all code, comments, commits, and documentation will be in English
- **Descriptive comments**: All code should be extensively documented with descriptive comments
- **CamelCase naming**: All compound words in the application should be written in CamelCase

### Technology Stack
- **Frontend**: Next.js 14 with Server Components
- **Styling**: Tailwind CSS for minimalist design
- **State Management**: Zustand/Jotai for reactive updates
- **Blockchain Connection**: ethers.js with WebSockets
- **Performance**: WASM for critical rendering operations
- **Deployment**: Vercel with Edge Functions
- **Version Control**: GitHub
- **CI/CD**: GitHub Actions integrated with Vercel

### Project Structure
```
sword/
├── public/           # Static assets
├── src/
│   ├── app/          # Next.js app router
│   ├── components/   # Reusable UI components
│   │   ├── ascii/    # ASCII art components
│   │   ├── ui/       # UI elements
│   │   └── layout/   # Layout components
│   ├── hooks/        # Custom React hooks
│   ├── lib/          # Utility functions and libraries
│   │   ├── blockchain/ # Blockchain connection and utilities
│   │   ├── ascii/    # ASCII art generation utilities
│   │   └── animation/ # Animation utilities
│   ├── store/        # State management
│   ├── styles/       # Global styles
│   └── types/        # TypeScript type definitions
├── tests/            # Test files
├── .env.local        # Environment variables (gitignored)
├── .gitignore        # Git ignore file
├── next.config.js    # Next.js configuration
├── package.json      # Dependencies and scripts
├── tailwind.config.js # Tailwind CSS configuration
└── tsconfig.json     # TypeScript configuration
```

### Documentation Standards
- **File Headers**: Each file should have a header comment explaining its purpose
- **Function Documentation**: All functions should have JSDoc comments
- **Component Documentation**: All components should have prop documentation
- **Complex Logic**: Any complex logic should have detailed explanations
- **TODO Comments**: Use TODO comments for future improvements
- **Example Format**:
  ```typescript
  /**
   * ComponentName - Brief description
   * 
   * Detailed description of what this component does, when to use it,
   * and any important considerations.
   * 
   * @param {PropType} propName - Description of the prop
   * @returns {JSX.Element} Description of what is returned
   */
  ```

### Core Features
- **ASCII Sword**: Central element that reacts to blockchain events
- **Block Visualization**: Spark effects when blocks are finalized
- **Transaction Tracking**: Visual representation of transactions
- **Responsive Design**: Optimized for desktop and mobile
- **Idle Animation**: Recurring animation (glowing, flickering) when blocks are finalized
- **Sword Enhancement**: Interactive elements to "sharpen" the sword through gasless signed transactions (with cooldown per wallet)
- **Progressive Sword Evolution**: Visual upgrades after certain milestones (e.g., 1000 signed transactions)

### Fuel for the Flames
- Legacy NFTs
- Various tokens
- Main token (presumably ETH)
- Simple on-chain transactions requiring gasless signatures

### Extended Features (Optional)
- **Haptic Feedback**: Vibration for important events
- **Sound Design**: Minimalist 8-bit soundscape
- **Multichain Support**: Different ASCII weapons for different blockchains
- **Achievements**: Unlockable animations

### Development Phases
1. **MVP**: Basic structure with ASCII sword and Ethereum connection
2. **Interactivity**: Implementation of event reactions
3. **Optimization**: Performance improvements and responsive design
4. **Extension**: Integration of optional features by priority

### Design Guidelines
- Dark background with high contrast for ASCII art
- Minimal color accents (optional: neon highlights)
- Terminal-inspired UI elements
- Clear typography for readability
- Intuitive, unobtrusive user guidance

### Security Notes
- THIS MANIFEST MUST NEVER BE PUBLISHED ONLINE
- Keep all sensitive design information internal

### ASCII Sword Designs
#### Level 1 Sword (Basic Sword)
```
       /█\     
       |█|     
       |█|     
       |█|     
       |█|     
       |█|     
       |█|     
       |█|     
       |█|     
       |█|     
       |█|     
       |█|     
       |█|     
       |█|     
     __▓█▓__   
    /███████\  
       |█|     
       |█|     
       |█|     
        V      
```

#### Level 2 Sword (Enhanced Sword)
```
      /██\      
      |██|      
      |██|      
      |██|      
      |██|      
      |██|      
      |██|      
      |██|      
      |██|      
      |██|      
      |██|      
      |██|      
      |██|      
      |██|      
    __▓██▓__    
   /███████\   
      |██|      
      |██|      
      |██|      
       VV       
```

#### Level 3 Sword (Dragon Slayer)
```
      /▓▓\      
     /████\     
     |████|     
     |████|     
     |████|     
     |████|     
     |████|     
     |████|     
     |████|     
     |████|     
     |████|     
     |████|     
     |████|     
     |████|     
    /█████\    
   /███████\   
   \███████/   
    \▓█▓▓▓/    
     |███|     
     |███|     
      ▓▓▓      
```

This manifest serves as a living document and can be adapted during development. 