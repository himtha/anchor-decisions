import React, { useState } from 'react';
import {
  Box,
  TextField,
  Slider,
  Paper,
  Typography,
  Container,
  Button,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
  Stack,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  LinearProgress,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { Decision } from '../../types/decision';

interface Factor {
  name: string;
  score: number;
  valueAlignment?: string; // Which value this factor aligns with
}

interface Sentiment {
  positive: number;
  negative: number;
  neutral: number;
  tone?: string; // Descriptive tone like "Mostly Neutral with Slight Positivity"
}

interface BiasDetection {
  biasType: string; // e.g., "Loss Aversion", "Confirmation Bias"
  description: string;
  suggestion: string;
}

interface OptionPosition {
  x: number; // Emotional (0) to Logical (100)
  y: number; // Short-term (0) to Long-term (100)
}

interface Analysis {
  recommendation: string;
  factors: Factor[];
  sentiment: Sentiment;
  detectedBiases?: BiasDetection[];
  valueConflicts?: string[];
  optionPositions?: Record<string, OptionPosition>; // Map option names to positions
  thirdOption?: string;
}

// List of potentially harmful or concerning keywords
const HARMFUL_KEYWORDS = [
  'kill', 'suicide', 'murder', 'hurt', 'harm', 'die', 'death', 'violent', 'weapon',
  'gun', 'bomb', 'attack', 'destroy', 'revenge', 'illegal', 'crime'
];

// List of common values people consider in decisions
const COMMON_VALUES = [
  'Family', 'Health', 'Financial Security', 'Career Growth', 'Happiness',
  'Freedom', 'Stability', 'Adventure', 'Learning', 'Relationships', 'Community',
  'Spirituality', 'Creativity', 'Achievement', 'Balance'
];

// Common cognitive biases in decision making
const COGNITIVE_BIASES = [
  {
    biasType: 'Loss Aversion',
    description: 'The tendency to prefer avoiding losses over acquiring equivalent gains.',
    suggestion: 'Try to evaluate potential gains with the same weight as potential losses.'
  },
  {
    biasType: 'Confirmation Bias',
    description: 'The tendency to search for or interpret information in a way that confirms one\'s preconceptions.',
    suggestion: 'Actively seek out information that challenges your initial assumptions.'
  },
  {
    biasType: 'Recency Bias',
    description: 'The tendency to weigh recent events more heavily than earlier events.',
    suggestion: 'Consider the full history and pattern of outcomes, not just recent experiences.'
  },
  {
    biasType: 'Status Quo Bias',
    description: 'The preference for the current state of affairs, leading to resistance to change.',
    suggestion: 'Evaluate the status quo option as critically as you would any new option.'
  },
  {
    biasType: 'Emotional Reasoning',
    description: 'Making decisions based on how you feel rather than objective evidence.',
    suggestion: 'Acknowledge your emotions, but also look for concrete facts to support your decision.'
  }
];

const DecisionDashboard = () => {
  const [decision, setDecision] = useState<Partial<Decision>>({
    question: '',
    balanceScore: 50, // 0 = fully emotional, 100 = fully logical
    timeHorizon: 50, // 0 = short-term, 100 = long-term
  });

  // Decision context
  const [options, setOptions] = useState<string[]>(['', '']);
  const [stakes, setStakes] = useState('');
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [initialIntuition, setInitialIntuition] = useState('');
  const [confidenceScore, setConfidenceScore] = useState<number>(70);

  // UI state
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'question' | 'intuition' | 'context' | 'analysis' | 'confidence'>('question');

  // Safety features
  const [showSafetyDialog, setShowSafetyDialog] = useState(false);
  const [safetyMessage, setSafetyMessage] = useState('');

  // Additional features
  const [showBiasInfo, setShowBiasInfo] = useState<string | null>(null); // Stores the bias type being viewed
  const [showThirdOption, setShowThirdOption] = useState(false);
  const [showTimeCapsule, setShowTimeCapsule] = useState(false);
  const [timeCapsuleScheduled, setTimeCapsuleScheduled] = useState(false);
  const [journalSaved, setJournalSaved] = useState(false);
  const [showJournalDialog, setShowJournalDialog] = useState(false);

  const handleQuestionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const question = event.target.value;

    // Check for harmful content
    const lowerQuestion = question.toLowerCase();
    const foundHarmfulWord = HARMFUL_KEYWORDS.find(word => lowerQuestion.includes(word));

    if (foundHarmfulWord) {
      setSafetyMessage(
        "It seems like your question might be about a concerning topic. " +
        "If you're feeling overwhelmed or having harmful thoughts, " +
        "please consider reaching out to a mental health professional or a trusted person in your life. " +
        "You can also call or text a crisis helpline for immediate support."
      );
      setShowSafetyDialog(true);
    }

    setDecision((prev: Partial<Decision>) => ({
      ...prev,
      question,
    }));

    // Reset submitted state when question changes
    if (submitted) {
      setSubmitted(false);
      setAnalysis(null);
      setCurrentStep('question');
    }
  };

  const handleBalanceChange = (
    event: Event,
    newValue: number | number[]
  ) => {
    setDecision((prev: Partial<Decision>) => ({
      ...prev,
      balanceScore: newValue as number,
    }));
  };

  const handleTimeHorizonChange = (
    event: Event,
    newValue: number | number[]
  ) => {
    setDecision((prev: Partial<Decision>) => ({
      ...prev,
      timeHorizon: newValue as number,
    }));
  };

  const handleInitialIntuitionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInitialIntuition(event.target.value);
  };

  const handleConfidenceChange = (
    event: Event,
    newValue: number | number[]
  ) => {
    setConfidenceScore(newValue as number);
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleStakesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setStakes(event.target.value);
  };

  const handleValueChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedValues(event.target.value as string[]);
  };

  const handleContinue = () => {
    if (currentStep === 'question') {
      if (!decision.question) {
        setError('Please enter a decision question');
        return;
      }
      setError(null);
      setCurrentStep('intuition');
    } else if (currentStep === 'intuition') {
      if (!initialIntuition) {
        setError('Please share your initial intuition');
        return;
      }
      setError(null);
      setCurrentStep('context');
    } else if (currentStep === 'context') {
      if (options[0] === '' && options[1] === '') {
        setError('Please enter at least one option you are considering');
        return;
      }
      setError(null);
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep === 'intuition') {
      setCurrentStep('question');
    } else if (currentStep === 'context') {
      setCurrentStep('intuition');
    } else if (currentStep === 'analysis') {
      setCurrentStep('context');
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      // In a real app, this would be an API call to the backend
      // For now, we'll simulate a response
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock analysis result
      const balanceScore = decision.balanceScore || 50;
      const timeHorizon = decision.timeHorizon || 50;
      const isMoreLogical = balanceScore > 50;
      const isLongTerm = timeHorizon > 50;

      // Generate more insightful recommendations based on context
      let recommendation = '';
      if (isMoreLogical) {
        recommendation = `Your approach to "${decision.question}" is primarily logical (${balanceScore}% logical). `;

        if (selectedValues.length > 0) {
          const emotionalValue = selectedValues[Math.floor(Math.random() * selectedValues.length)];
          recommendation += `While your logical analysis is sound, consider how this decision aligns with your value of ${emotionalValue.toLowerCase()}. `;
        }

        if (options[0] && options[1]) {
          recommendation += `Between ${options[0]} and ${options[1]}, which option better serves your emotional well-being in the long run?`;
        } else {
          recommendation += 'Remember that even the most logical decisions should account for emotional impact.';
        }
      } else {
        recommendation = `Your approach to "${decision.question}" is primarily emotional (${100 - balanceScore}% emotional). `;

        if (stakes) {
          recommendation += `Given what's at stake (${stakes}), it may be helpful to balance your emotional intuition with some logical analysis. `;
        }

        if (options[0] && options[1]) {
          recommendation += `Try creating a pros and cons list for ${options[0]} vs ${options[1]} to ensure you're not overlooking important practical factors.`;
        } else {
          recommendation += 'Consider writing down the practical pros and cons to complement your emotional intuition.';
        }
      }

      // Add intuition comparison
      recommendation += `\n\nYour initial intuition was: "${initialIntuition}". `;

      if (isLongTerm) {
        recommendation += `You're focusing on long-term outcomes, which is often beneficial for major life decisions.`;
      } else {
        recommendation += `You're focusing more on short-term outcomes. Consider if this aligns with the importance of this decision.`;
      }

      // Generate factors based on selected values and context
      const factors: Factor[] = [];

      // Add value-based factors
      if (selectedValues.length > 0) {
        selectedValues.forEach(value => {
          factors.push({
            name: `${value} alignment`,
            score: Math.floor(Math.random() * 40) + 60, // Higher scores for personal values
            valueAlignment: value
          });
        });
      }

      // Add standard factors
      const financialImpact = Math.floor(Math.random() * 100);
      const emotionalWellbeing = Math.floor(Math.random() * 100);
      const longTermConsequences = Math.floor(Math.random() * 100);

      factors.push({ name: 'Financial impact', score: financialImpact });
      factors.push({ name: 'Emotional well-being', score: emotionalWellbeing });
      factors.push({ name: 'Long-term consequences', score: longTermConsequences });

      // Add stakes-based factor if provided
      if (stakes) {
        factors.push({ name: `Impact on ${stakes}`, score: Math.floor(Math.random() * 100) });
      }

      // Detect potential biases
      const detectedBiases: BiasDetection[] = [];

      // Loss aversion detection
      if (financialImpact > 70 && balanceScore < 40) {
        detectedBiases.push(COGNITIVE_BIASES[0]); // Loss Aversion
      }

      // Emotional reasoning detection
      if (balanceScore < 30 && emotionalWellbeing > 80) {
        detectedBiases.push(COGNITIVE_BIASES[4]); // Emotional Reasoning
      }

      // Status quo bias detection
      if (options[0]?.toLowerCase().includes('stay') || options[0]?.toLowerCase().includes('current')) {
        detectedBiases.push(COGNITIVE_BIASES[3]); // Status Quo Bias
      }

      // Generate sentiment tone
      let sentimentTone = '';
      const positive = Math.random() * 0.7 + 0.3;
      const negative = Math.random() * 0.3;
      const neutral = Math.random() * 0.2;

      if (positive > 0.6) {
        sentimentTone = '🌱 Growth-Oriented Language';
      } else if (negative > 0.2) {
        sentimentTone = '🔥 High Tension Detected';
      } else {
        sentimentTone = '🌤️ Mostly Neutral with Slight Positivity';
      }

      // Generate option positions for the decision compass
      const optionPositions: Record<string, OptionPosition> = {};

      // Helper function to ensure positions are well-distributed in the graph
      const generatePosition = (baseX: number, baseY: number, isSecondOption = false): OptionPosition => {
        // For the first option, stay closer to the user's input values
        // For the second option, ensure it's in a different quadrant for better visualization
        const xVariance = isSecondOption ? 40 : 20;
        const yVariance = isSecondOption ? 40 : 20;

        let x, y;

        if (isSecondOption) {
          // For second option, try to place it in a different quadrant
          const firstQuadrantX = baseX > 50;
          const firstQuadrantY = baseY > 50;

          // Generate position likely to be in a different quadrant
          x = firstQuadrantX ?
            Math.max(10, Math.min(45, 30 + (Math.random() * 15))) :
            Math.max(55, Math.min(90, 70 + (Math.random() * 15)));

          y = firstQuadrantY ?
            Math.max(10, Math.min(45, 30 + (Math.random() * 15))) :
            Math.max(55, Math.min(90, 70 + (Math.random() * 15)));
        } else {
          // For first option, stay closer to the user's input values
          x = Math.max(15, Math.min(85, baseX + (Math.random() * xVariance - xVariance/2)));
          y = Math.max(15, Math.min(85, baseY + (Math.random() * yVariance - yVariance/2)));
        }

        return { x, y };
      };

      if (options[0]) {
        optionPositions[options[0]] = generatePosition(balanceScore, timeHorizon);
      }

      if (options[1]) {
        const firstX = options[0] ? optionPositions[options[0]].x : 50;
        const firstY = options[0] ? optionPositions[options[0]].y : 50;

        optionPositions[options[1]] = generatePosition(firstX, firstY, true);
      }

      // Generate value conflicts
      const valueConflicts: string[] = [];

      if (selectedValues.length >= 2) {
        // Randomly determine if there's a conflict
        if (Math.random() > 0.5) {
          const value1 = selectedValues[0];
          const value2 = selectedValues[1];
          valueConflicts.push(`Your values of ${value1} and ${value2} may be in tension for this decision.`);
        }
      }

      // Generate third option suggestion
      let thirdOption: string | undefined = undefined;
      if (options[0] && options[1] && Math.random() > 0.7) {
        thirdOption = `Have you considered a hybrid approach? Perhaps you could ${options[0].toLowerCase()} for a trial period before fully committing to ${options[1].toLowerCase()}.`;
      }

      const mockAnalysis: Analysis = {
        recommendation,
        factors,
        sentiment: {
          positive,
          negative,
          neutral,
          tone: sentimentTone
        },
        detectedBiases,
        valueConflicts,
        optionPositions,
        thirdOption
      };

      setAnalysis(mockAnalysis);
      setSubmitted(true);
      setCurrentStep('analysis');
    } catch (err) {
      setError('An error occurred while analyzing your decision. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to determine progress percentage based on current step
  const getProgressPercentage = () => {
    switch (currentStep) {
      case 'question':
        return 25;
      case 'intuition':
        return 50;
      case 'context':
        return 75;
      case 'analysis':
      case 'confidence':
        return 100;
      default:
        return 0;
    }
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        {/* Progress indicator */}
        {!submitted && (
          <Box sx={{ width: '100%', mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color={currentStep === 'question' ? 'primary' : 'text.secondary'}>
                Question
              </Typography>
              <Typography variant="body2" color={currentStep === 'intuition' ? 'primary' : 'text.secondary'}>
                Intuition
              </Typography>
              <Typography variant="body2" color={currentStep === 'context' ? 'primary' : 'text.secondary'}>
                Context
              </Typography>
              <Typography variant="body2" color={currentStep === 'analysis' ? 'primary' : 'text.secondary'}>
                Analysis
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={getProgressPercentage()}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        )}

        <Typography variant="h4" gutterBottom>
          What are you deciding?
        </Typography>

        {currentStep === 'question' && (
          <>
            <TextField
              fullWidth
              label="Your Decision Question"
              variant="outlined"
              value={decision.question}
              onChange={handleQuestionChange}
              sx={{ mb: 4 }}
              disabled={loading}
              placeholder="e.g., Should I accept the new job offer?"
            />

            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography gutterBottom sx={{ mr: 1 }}>
                  How are you approaching this decision?
                </Typography>
                <Tooltip title="0 = Fully emotional (gut feeling, intuition, emotions), 100 = Fully logical (facts, analysis, pros/cons)">
                  <IconButton size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Emotional</Typography>
                <Typography variant="body2">Logical</Typography>
              </Box>

              <Slider
                value={decision.balanceScore}
                onChange={handleBalanceChange}
                valueLabelDisplay="auto"
                sx={{ mb: 4 }}
                disabled={loading}
                marks={[
                  { value: 0, label: '0%' },
                  { value: 50, label: '50%' },
                  { value: 100, label: '100%' },
                ]}
              />

              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography gutterBottom sx={{ mr: 1 }}>
                  What's your time horizon for this decision?
                </Typography>
                <Tooltip title="0 = Short-term focus (immediate outcomes), 100 = Long-term focus (future impact)">
                  <IconButton size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Short-term</Typography>
                <Typography variant="body2">Long-term</Typography>
              </Box>

              <Slider
                value={decision.timeHorizon}
                onChange={handleTimeHorizonChange}
                valueLabelDisplay="auto"
                sx={{ mb: 4 }}
                disabled={loading}
                marks={[
                  { value: 0, label: '0%' },
                  { value: 50, label: '50%' },
                  { value: 100, label: '100%' },
                ]}
              />

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleContinue}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Continue'}
              </Button>
            </Box>
          </>
        )}

        {currentStep === 'intuition' && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              What's your gut telling you right now?
            </Typography>

            <Typography variant="body2" sx={{ mb: 3 }}>
              Capture your raw first instinct about this decision. Later, you can compare this with your final choice.
            </Typography>

            <TextField
              fullWidth
              label="Your Initial Intuition"
              variant="outlined"
              value={initialIntuition}
              onChange={handleInitialIntuitionChange}
              sx={{ mb: 4 }}
              disabled={loading}
              placeholder="e.g., I feel like I should take the job, but I'm nervous about the change"
              multiline
              rows={3}
            />

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button
                variant="outlined"
                onClick={handleBack}
                disabled={loading}
              >
                Back
              </Button>

              <Button
                variant="contained"
                color="primary"
                onClick={handleContinue}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Continue'}
              </Button>
            </Box>
          </Box>
        )}

        {currentStep === 'context' && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Let's add some context to your decision
            </Typography>

            <Typography variant="body2" sx={{ mb: 3 }}>
              Adding more details will help us provide a more insightful analysis
            </Typography>

            <Typography gutterBottom>What options are you considering?</Typography>
            <TextField
              fullWidth
              label="Option A"
              variant="outlined"
              value={options[0]}
              onChange={(e) => handleOptionChange(0, e.target.value)}
              sx={{ mb: 2 }}
              disabled={loading}
              placeholder="e.g., Accept the job offer"
            />

            <TextField
              fullWidth
              label="Option B"
              variant="outlined"
              value={options[1]}
              onChange={(e) => handleOptionChange(1, e.target.value)}
              sx={{ mb: 3 }}
              disabled={loading}
              placeholder="e.g., Stay at current job"
            />

            <Typography gutterBottom>What's at stake in this decision?</Typography>
            <TextField
              fullWidth
              label="What matters most in this decision"
              variant="outlined"
              value={stakes}
              onChange={handleStakesChange}
              sx={{ mb: 3 }}
              disabled={loading}
              placeholder="e.g., My career growth and financial stability"
            />

            <Typography gutterBottom>Which of your personal values are relevant to this decision?</Typography>
            <FormControl fullWidth sx={{ mb: 4 }}>
              <InputLabel>Select up to 3 values</InputLabel>
              <Select
                multiple
                value={selectedValues}
                onChange={handleValueChange as any}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map((value) => (
                      <Chip key={value} label={value} />
                    ))}
                  </Box>
                )}
                disabled={loading}
              >
                {COMMON_VALUES.map((value) => (
                  <MenuItem key={value} value={value} disabled={selectedValues.length >= 3 && !selectedValues.includes(value)}>
                    {value}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button
                variant="outlined"
                onClick={handleBack}
                disabled={loading}
              >
                Back
              </Button>

              <Button
                variant="contained"
                color="primary"
                onClick={handleContinue}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Analyze Decision'}
              </Button>
            </Box>
          </Box>
        )}

        {currentStep === 'analysis' && analysis && (
          <Box sx={{ mt: 4 }}>
            <Divider sx={{ mb: 3 }} />
            <Typography variant="h5" gutterBottom>
              Decision Analysis
            </Typography>

            <Typography variant="body1" sx={{ mb: 3, whiteSpace: 'pre-line' }}>
              {analysis.recommendation}
            </Typography>

            {/* Decision Compass */}
            {analysis.optionPositions && Object.keys(analysis.optionPositions).length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Decision Compass
                </Typography>

                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    border: '1px solid #e0e0e0',
                    height: 320,
                    position: 'relative',
                    mb: 3,
                    overflow: 'hidden'
                  }}
                >
                  {/* Quadrant labels */}
                  <Typography
                    variant="caption"
                    sx={{ position: 'absolute', left: 10, top: 10, color: 'text.secondary' }}
                  >
                    Emotional & Long-term
                  </Typography>

                  <Typography
                    variant="caption"
                    sx={{ position: 'absolute', right: 10, top: 10, color: 'text.secondary' }}
                  >
                    Logical & Long-term
                  </Typography>

                  <Typography
                    variant="caption"
                    sx={{ position: 'absolute', left: 10, bottom: 10, color: 'text.secondary' }}
                  >
                    Emotional & Short-term
                  </Typography>

                  <Typography
                    variant="caption"
                    sx={{ position: 'absolute', right: 10, bottom: 10, color: 'text.secondary' }}
                  >
                    Logical & Short-term
                  </Typography>

                  {/* X-axis labels */}
                  <Typography
                    variant="body2"
                    sx={{ position: 'absolute', left: '25%', bottom: 10, transform: 'translateX(-50%)', fontWeight: 'bold' }}
                  >
                    Emotional
                  </Typography>

                  <Typography
                    variant="body2"
                    sx={{ position: 'absolute', left: '75%', bottom: 10, transform: 'translateX(-50%)', fontWeight: 'bold' }}
                  >
                    Logical
                  </Typography>

                  {/* Y-axis labels */}
                  <Typography
                    variant="body2"
                    sx={{ position: 'absolute', top: '75%', left: 10, transform: 'translateY(-50%) rotate(-90deg)', fontWeight: 'bold' }}
                  >
                    Short-term
                  </Typography>

                  <Typography
                    variant="body2"
                    sx={{ position: 'absolute', top: '25%', left: 10, transform: 'translateY(-50%) rotate(-90deg)', fontWeight: 'bold' }}
                  >
                    Long-term
                  </Typography>

                  {/* Axes */}
                  <Box sx={{
                    position: 'absolute',
                    left: '50%',
                    top: 0,
                    bottom: 0,
                    width: 1,
                    bgcolor: '#e0e0e0',
                    zIndex: 1
                  }} />

                  <Box sx={{
                    position: 'absolute',
                    top: '50%',
                    left: 0,
                    right: 0,
                    height: 1,
                    bgcolor: '#e0e0e0',
                    zIndex: 1
                  }} />

                  {/* Grid lines */}
                  <Box sx={{
                    position: 'absolute',
                    left: '25%',
                    top: 0,
                    bottom: 0,
                    width: 1,
                    bgcolor: '#f5f5f5',
                    zIndex: 0
                  }} />

                  <Box sx={{
                    position: 'absolute',
                    left: '75%',
                    top: 0,
                    bottom: 0,
                    width: 1,
                    bgcolor: '#f5f5f5',
                    zIndex: 0
                  }} />

                  <Box sx={{
                    position: 'absolute',
                    top: '25%',
                    left: 0,
                    right: 0,
                    height: 1,
                    bgcolor: '#f5f5f5',
                    zIndex: 0
                  }} />

                  <Box sx={{
                    position: 'absolute',
                    top: '75%',
                    left: 0,
                    right: 0,
                    height: 1,
                    bgcolor: '#f5f5f5',
                    zIndex: 0
                  }} />

                  {/* Plot points */}
                  {Object.entries(analysis.optionPositions).map(([option, position], index) => (
                    <Tooltip key={index} title={option}>
                      <Chip
                        label={`${index + 1}`}
                        color={index === 0 ? 'primary' : 'secondary'}
                        sx={{
                          position: 'absolute',
                          left: `${position.x}%`,
                          top: `${100 - position.y}%`, // Invert Y-axis for correct positioning
                          transform: 'translate(-50%, -50%)',
                          zIndex: 2,
                          fontWeight: 'bold'
                        }}
                      />
                    </Tooltip>
                  ))}
                </Paper>

                <Box sx={{ mb: 2 }}>
                  {Object.entries(analysis.optionPositions).map(([option, position], index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Chip
                        label={`${index + 1}`}
                        color={index === 0 ? 'primary' : 'secondary'}
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      <Typography variant="body2">
                        <strong>{option}</strong> -
                        {position.x < 50 ? ' More emotional' : ' More logical'},
                        {position.y < 50 ? ' short-term focused' : ' long-term focused'}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* Key Factors */}
            <Typography variant="h6" gutterBottom>
              Key Factors
            </Typography>

            <List>
              {analysis.factors.map((factor: Factor, index: number) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={factor.name}
                    secondary={
                      <>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box sx={{ width: '60%', mr: 1 }}>
                            <Slider
                              value={factor.score}
                              disabled
                              sx={{
                                '& .MuiSlider-thumb': {
                                  display: 'none',
                                },
                              }}
                            />
                          </Box>
                          <Typography variant="body2">{factor.score}/100</Typography>
                        </Box>
                        {factor.valueAlignment && (
                          <Typography variant="caption" color="primary">
                            Aligns with your value: {factor.valueAlignment}
                          </Typography>
                        )}
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>

            {/* Value Conflicts */}
            {analysis.valueConflicts && analysis.valueConflicts.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Value Conflicts
                </Typography>

                {analysis.valueConflicts.map((conflict, index) => (
                  <Alert key={index} severity="info" sx={{ mb: 2 }}>
                    {conflict}
                  </Alert>
                ))}
              </Box>
            )}

            {/* Cognitive Biases */}
            {analysis.detectedBiases && analysis.detectedBiases.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Potential Cognitive Biases
                </Typography>

                {analysis.detectedBiases.map((bias, index) => (
                  <Paper key={index} elevation={0} sx={{ p: 2, mb: 2, border: '1px solid #e0e0e0' }}>
                    <Typography variant="subtitle1" color="warning.main">
                      {bias.biasType}
                    </Typography>

                    {showBiasInfo === bias.biasType ? (
                      <>
                        <Typography variant="body2" sx={{ mt: 1, mb: 2 }}>
                          {bias.description}
                        </Typography>

                        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                          Suggestion:
                        </Typography>

                        <Typography variant="body2" sx={{ mb: 2 }}>
                          {bias.suggestion}
                        </Typography>

                        <Button
                          size="small"
                          onClick={() => setShowBiasInfo(null)}
                        >
                          Hide Details
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="small"
                        onClick={() => setShowBiasInfo(bias.biasType)}
                        sx={{ mt: 1 }}
                      >
                        Learn About This Bias
                      </Button>
                    )}
                  </Paper>
                ))}
              </Box>
            )}

            {/* Third Option Suggestion */}
            {analysis.thirdOption && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Alternative Approach
                </Typography>

                <Alert severity="success" sx={{ mb: 2 }}>
                  {analysis.thirdOption}
                </Alert>

                {!showThirdOption && (
                  <Button
                    size="small"
                    onClick={() => setShowThirdOption(true)}
                    sx={{ mt: 1 }}
                  >
                    Explore This Option
                  </Button>
                )}
              </Box>
            )}

            {/* Sentiment Analysis */}
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Sentiment Analysis
            </Typography>

            <Box sx={{ mb: 3 }}>
              {analysis.sentiment.tone && (
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {analysis.sentiment.tone}
                </Typography>
              )}

              <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
                <Chip
                  label={`Positive: ${Math.round(analysis.sentiment.positive * 100)}%`}
                  color="success"
                  variant="outlined"
                />
                <Chip
                  label={`Negative: ${Math.round(analysis.sentiment.negative * 100)}%`}
                  color="error"
                  variant="outlined"
                />
                <Chip
                  label={`Neutral: ${Math.round(analysis.sentiment.neutral * 100)}%`}
                  color="default"
                  variant="outlined"
                />
              </Stack>
            </Box>

            {/* Confidence Slider */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                How confident are you in acting on this decision?
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Not confident</Typography>
                <Typography variant="body2">Very confident</Typography>
              </Box>

              <Slider
                value={confidenceScore}
                onChange={handleConfidenceChange}
                valueLabelDisplay="auto"
                sx={{ mb: 2 }}
                marks={[
                  { value: 0, label: '0%' },
                  { value: 50, label: '50%' },
                  { value: 100, label: '100%' },
                ]}
              />

              <Typography variant="body2" color="text.secondary">
                Your confidence level: {confidenceScore}%
              </Typography>
            </Box>

            {/* Action Buttons Section */}
            <Box sx={{ mb: 4, display: 'flex', gap: 2 }}>
              {/* Journal Entry Button */}
              <Box sx={{ flex: 1, p: 2, bgcolor: 'background.paper', border: '1px dashed #ccc', borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom>
                  📓 Decision Journal
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Save this decision as a journal entry to track your decision-making patterns over time.
                </Typography>
                <Button
                  variant={journalSaved ? 'contained' : 'outlined'}
                  onClick={() => setShowJournalDialog(true)}
                  fullWidth
                  color={journalSaved ? 'success' : 'primary'}
                  startIcon={journalSaved ? <>✅</> : null}
                >
                  {journalSaved ? 'Saved to Journal' : 'Save as Journal Entry'}
                </Button>
              </Box>

              {/* Time Capsule Button */}
              <Box sx={{ flex: 1, p: 2, bgcolor: 'background.paper', border: '1px dashed #ccc', borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom>
                  🕰️ Decision Time Capsule
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Schedule a 7-day follow-up to reflect on how you feel about your choice.
                </Typography>
                <Button
                  variant={timeCapsuleScheduled ? 'contained' : 'outlined'}
                  onClick={() => setShowTimeCapsule(true)}
                  fullWidth
                  color={timeCapsuleScheduled ? 'success' : 'primary'}
                  startIcon={timeCapsuleScheduled ? <>✅</> : null}
                  disabled={timeCapsuleScheduled}
                >
                  {timeCapsuleScheduled ? 'Check-in Scheduled' : 'Schedule a Check-in'}
                </Button>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button
                variant="outlined"
                onClick={handleBack}
              >
                Back to Context
              </Button>

              <Button
                variant="contained"
                color="primary"
                onClick={() => {
                  // Reset all state
                  setSubmitted(false);
                  setAnalysis(null);
                  setCurrentStep('question');
                  setDecision({
                    question: '',
                    balanceScore: 50,
                    timeHorizon: 50,
                  });
                  setOptions(['', '']);
                  setStakes('');
                  setSelectedValues([]);
                  setInitialIntuition('');
                  setConfidenceScore(70);

                  // Reset feature flags
                  setShowBiasInfo(null);
                  setShowThirdOption(false);
                  setTimeCapsuleScheduled(false);
                  setJournalSaved(false);
                }}
              >
                Start New Decision
              </Button>
            </Box>
          </Box>
        )}
      </Paper>

      {/* Safety Dialog */}
      <Dialog
        open={showSafetyDialog}
        onClose={() => setShowSafetyDialog(false)}
        aria-labelledby="safety-dialog-title"
        aria-describedby="safety-dialog-description"
      >
        <DialogTitle id="safety-dialog-title">
          We're here to help
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="safety-dialog-description">
            {safetyMessage}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSafetyDialog(false)} color="primary" autoFocus>
            I understand
          </Button>
          <Button
            onClick={() => window.open('https://988lifeline.org/', '_blank')}
            color="primary"
          >
            Find Support Resources
          </Button>
        </DialogActions>
      </Dialog>

      {/* Time Capsule Dialog */}
      <Dialog
        open={showTimeCapsule}
        onClose={() => setShowTimeCapsule(false)}
        aria-labelledby="time-capsule-dialog-title"
      >
        <DialogTitle id="time-capsule-dialog-title">
          Schedule a Decision Check-in
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Would you like to revisit this decision in 7 days to reflect on how you feel about it?
          </DialogContentText>
          <DialogContentText variant="body2" color="text.secondary">
            We'll save your decision details and analysis. You'll receive a reminder to reflect on:
            <ul>
              <li>Did you follow through with your decision?</li>
              <li>How do you feel about the outcome?</li>
              <li>Did your initial intuition match the reality?</li>
            </ul>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTimeCapsule(false)} color="primary">
            Not now
          </Button>
          <Button
            onClick={() => {
              setTimeCapsuleScheduled(true);
              setShowTimeCapsule(false);
            }}
            color="primary"
            variant="contained"
          >
            Schedule Check-in
          </Button>
        </DialogActions>
      </Dialog>

      {/* Journal Entry Dialog */}
      <Dialog
        open={showJournalDialog}
        onClose={() => setShowJournalDialog(false)}
        aria-labelledby="journal-dialog-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="journal-dialog-title">
          Save as Journal Entry
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Your decision will be saved to your journal for future reference.
          </DialogContentText>

          <Typography variant="subtitle1" gutterBottom>
            Decision Summary
          </Typography>

          <Box sx={{ mb: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="body2" gutterBottom><strong>Question:</strong> {decision.question}</Typography>
            <Typography variant="body2" gutterBottom><strong>Approach:</strong> {decision.balanceScore && decision.balanceScore > 50 ? 'Primarily Logical' : 'Primarily Emotional'}</Typography>
            <Typography variant="body2" gutterBottom><strong>Time Horizon:</strong> {decision.timeHorizon && decision.timeHorizon > 50 ? 'Long-term Focus' : 'Short-term Focus'}</Typography>
            <Typography variant="body2" gutterBottom><strong>Initial Intuition:</strong> {initialIntuition}</Typography>
            <Typography variant="body2" gutterBottom><strong>Confidence Level:</strong> {confidenceScore}%</Typography>
            {options[0] && <Typography variant="body2" gutterBottom><strong>Option A:</strong> {options[0]}</Typography>}
            {options[1] && <Typography variant="body2" gutterBottom><strong>Option B:</strong> {options[1]}</Typography>}
            {selectedValues.length > 0 && (
              <Typography variant="body2" gutterBottom>
                <strong>Values:</strong> {selectedValues.join(', ')}
              </Typography>
            )}
          </Box>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Tags</InputLabel>
            <Select
              multiple
              value={['Decision']}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((value) => (
                    <Chip key={value} label={value} />
                  ))}
                </Box>
              )}
            >
              <MenuItem value="Decision" disabled>
                Decision
              </MenuItem>
              <MenuItem value="Career">
                Career
              </MenuItem>
              <MenuItem value="Relationships">
                Relationships
              </MenuItem>
              <MenuItem value="Finance">
                Finance
              </MenuItem>
              <MenuItem value="Health">
                Health
              </MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Additional Notes"
            multiline
            rows={3}
            placeholder="Add any additional thoughts or context about this decision..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowJournalDialog(false)} color="primary">
            Cancel
          </Button>
          <Button
            onClick={() => {
              setJournalSaved(true);
              setShowJournalDialog(false);
            }}
            color="primary"
            variant="contained"
          >
            Save to Journal
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DecisionDashboard;
