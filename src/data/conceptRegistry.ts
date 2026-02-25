/**
 * Concept Registry — maps statistical terms to their home module.
 * Each entry: { term, moduleId, display, desc, wordBoundary? }
 *
 * wordBoundary: true on short/ambiguous terms to prevent false matches.
 * Terms are matched longest-first by the conceptLinker regex builder.
 */
export interface ConceptEntry {
  term: string;
  moduleId: string;
  display: string;
  desc: string;
  wordBoundary?: boolean;
}

const concepts: ConceptEntry[] = [
  // Foundations (m1–m4)
  {
    term: 'Type I error',
    moduleId: 'm1',
    display: 'Type I & II Errors',
    desc: 'Rejecting a true null hypothesis (false alarm)',
  },
  {
    term: 'Type II error',
    moduleId: 'm1',
    display: 'Type I & II Errors',
    desc: 'Failing to reject a false null hypothesis (missed signal)',
  },
  {
    term: 'false positive',
    moduleId: 'm1',
    display: 'Type I & II Errors',
    desc: 'Concluding an effect exists when it does not',
  },
  {
    term: 'false negative',
    moduleId: 'm1',
    display: 'Type I & II Errors',
    desc: 'Failing to detect a real effect',
  },
  {
    term: 'significance level',
    moduleId: 'm2',
    display: 'P-Value & Significance',
    desc: 'The threshold (alpha) for rejecting H0',
  },
  {
    term: 'p-value',
    moduleId: 'm2',
    display: 'P-Value & Significance',
    desc: 'Probability of observing data at least as extreme under H0',
  },
  {
    term: 'null hypothesis',
    moduleId: 'm2',
    display: 'P-Value & Significance',
    desc: 'The default assumption of no effect or difference',
  },
  {
    term: 'confidence interval',
    moduleId: 'm3',
    display: 'Confidence Intervals',
    desc: 'A range of plausible values for the true parameter',
  },
  {
    term: 'Bayesian',
    moduleId: 'm4',
    display: 'Bayesian vs Frequentist',
    desc: 'Statistical approach using prior beliefs and Bayes theorem',
    wordBoundary: true,
  },
  {
    term: 'frequentist',
    moduleId: 'm4',
    display: 'Bayesian vs Frequentist',
    desc: 'Statistical approach based on long-run frequency of events',
  },
  {
    term: 'posterior',
    moduleId: 'm4',
    display: 'Bayesian vs Frequentist',
    desc: 'Updated belief distribution after observing data',
  },
  {
    term: 'prior distribution',
    moduleId: 'm4',
    display: 'Bayesian vs Frequentist',
    desc: 'Belief distribution before observing data',
  },

  // Design (m5–m10)
  {
    term: 'randomization',
    moduleId: 'm5',
    display: 'Experiment Structure',
    desc: 'Random assignment of units to treatment and control',
  },
  {
    term: 'control group',
    moduleId: 'm5',
    display: 'Experiment Structure',
    desc: 'The baseline group that receives no treatment change',
  },
  {
    term: 'treatment group',
    moduleId: 'm5',
    display: 'Experiment Structure',
    desc: 'The group exposed to the experimental change',
  },
  {
    term: 'guardrail metric',
    moduleId: 'm6',
    display: 'Metrics & Guardrails',
    desc: 'A safety metric that should not degrade during an experiment',
  },
  {
    term: 'guardrail metrics',
    moduleId: 'm6',
    display: 'Metrics & Guardrails',
    desc: 'Safety metrics that should not degrade during an experiment',
  },
  {
    term: 'primary metric',
    moduleId: 'm6',
    display: 'Metrics & Guardrails',
    desc: 'The main success metric for an experiment',
  },
  {
    term: 'sample size',
    moduleId: 'm7',
    display: 'Sample Size & Power',
    desc: 'Number of observations needed for reliable results',
  },
  {
    term: 'statistical power',
    moduleId: 'm7',
    display: 'Sample Size & Power',
    desc: 'Probability of detecting a true effect',
  },
  {
    term: 'power analysis',
    moduleId: 'm7',
    display: 'Sample Size & Power',
    desc: 'Calculating the sample size needed for desired power',
  },
  {
    term: 'effect size',
    moduleId: 'm8',
    display: 'Effect Size & MDE',
    desc: 'The magnitude of the difference between groups',
  },
  {
    term: 'minimum detectable effect',
    moduleId: 'm8',
    display: 'Effect Size & MDE',
    desc: 'The smallest effect your experiment can reliably detect',
  },
  {
    term: "Cohen's d",
    moduleId: 'm8',
    display: 'Effect Size & MDE',
    desc: 'Standardized measure of effect size between two means',
  },
  {
    term: 'MDE',
    moduleId: 'm8',
    display: 'Effect Size & MDE',
    desc: 'Minimum Detectable Effect — smallest reliably detectable improvement',
    wordBoundary: true,
  },
  {
    term: 'CUPED',
    moduleId: 'm9',
    display: 'Variance Reduction',
    desc: 'Controlled-experiment Using Pre-Experiment Data — a variance reduction technique',
    wordBoundary: true,
  },
  {
    term: 'variance reduction',
    moduleId: 'm9',
    display: 'Variance Reduction',
    desc: 'Techniques to reduce noise and increase experiment sensitivity',
  },
  {
    term: 'stratification',
    moduleId: 'm9',
    display: 'Variance Reduction',
    desc: 'Dividing the population into subgroups to reduce variance',
  },

  // Validate & Run (m11–m15)
  {
    term: 'A/A test',
    moduleId: 'm11',
    display: 'A/A Testing',
    desc: 'Comparing two identical groups to validate the testing system',
  },
  {
    term: 'sequential testing',
    moduleId: 'm12',
    display: 'Sequential Testing',
    desc: 'Analyzing results continuously with controlled error rates',
  },
  {
    term: 'alpha spending',
    moduleId: 'm12',
    display: 'Sequential Testing',
    desc: 'Function controlling how alpha is spent across interim analyses',
  },
  {
    term: "O'Brien-Fleming",
    moduleId: 'm12',
    display: 'Sequential Testing',
    desc: 'A conservative alpha spending boundary for sequential tests',
  },
  {
    term: 'selection bias',
    moduleId: 'm13',
    display: 'Validity Threats',
    desc: 'Systematic differences between groups due to non-random assignment',
  },
  {
    term: 'internal validity',
    moduleId: 'm13',
    display: 'Validity Threats',
    desc: 'Confidence that the treatment caused the observed effect',
  },
  {
    term: 'novelty effect',
    moduleId: 'm14',
    display: 'Novelty & Time Effects',
    desc: 'Temporary behavior change caused by the newness of a feature',
  },
  {
    term: 'interaction effect',
    moduleId: 'm15',
    display: 'Interaction Effects',
    desc: 'When the effect of one factor depends on the level of another',
  },

  // Analyze (m16–m18)
  {
    term: 'multiple testing',
    moduleId: 'm16',
    display: 'Multiple Testing',
    desc: 'Running many hypothesis tests simultaneously',
  },
  {
    term: 'Bonferroni',
    moduleId: 'm16',
    display: 'Multiple Testing',
    desc: 'A conservative correction dividing alpha by the number of tests',
  },
  {
    term: 'Benjamini-Hochberg',
    moduleId: 'm16',
    display: 'Multiple Testing',
    desc: 'A procedure controlling the false discovery rate',
  },
  {
    term: 'family-wise error rate',
    moduleId: 'm16',
    display: 'Multiple Testing',
    desc: 'Probability of at least one false positive across all tests',
  },
  {
    term: 'false discovery rate',
    moduleId: 'm16',
    display: 'Multiple Testing',
    desc: 'Expected proportion of false positives among rejected hypotheses',
  },
  {
    term: 'FWER',
    moduleId: 'm16',
    display: 'Multiple Testing',
    desc: 'Family-Wise Error Rate — probability of any false positive',
    wordBoundary: true,
  },
  {
    term: 'FDR',
    moduleId: 'm16',
    display: 'Multiple Testing',
    desc: 'False Discovery Rate — expected fraction of false positives among discoveries',
    wordBoundary: true,
  },
  {
    term: 'practical significance',
    moduleId: 'm18',
    display: 'Practical vs Statistical Significance',
    desc: 'Whether an effect is large enough to matter in practice',
  },

  // Interpret & Decide (m19–m22)
  {
    term: 'heterogeneous treatment effect',
    moduleId: 'm20',
    display: 'Heterogeneous Effects',
    desc: 'When treatment impact varies across subpopulations',
  },
  {
    term: 'subgroup analysis',
    moduleId: 'm20',
    display: 'Heterogeneous Effects',
    desc: 'Examining treatment effects within specific population segments',
  },
  {
    term: "Simpson's paradox",
    moduleId: 'm21',
    display: "Simpson's Paradox",
    desc: 'When a trend reverses after aggregating subgroups',
  },
  {
    term: 'confounding variable',
    moduleId: 'm21',
    display: "Simpson's Paradox",
    desc: 'A variable that influences both treatment assignment and outcome',
  },
  {
    term: 'regression to the mean',
    moduleId: 'm22',
    display: 'Regression to the Mean',
    desc: 'Extreme observations tend to be followed by less extreme ones',
  },

  // Model & Evaluate (m23–m29)
  {
    term: 'AUC-ROC',
    moduleId: 'm23',
    display: 'Model Metrics',
    desc: 'Area under the Receiver Operating Characteristic curve',
  },
  {
    term: 'precision and recall',
    moduleId: 'm23',
    display: 'Model Metrics',
    desc: 'Metrics for classification accuracy and coverage',
  },
  {
    term: 'F1 score',
    moduleId: 'm23',
    display: 'Model Metrics',
    desc: 'Harmonic mean of precision and recall',
    wordBoundary: true,
  },
  {
    term: 'calibration',
    moduleId: 'm24',
    display: 'Calibration',
    desc: 'How well predicted probabilities match observed frequencies',
    wordBoundary: true,
  },
  {
    term: 'Brier score',
    moduleId: 'm24',
    display: 'Calibration',
    desc: 'Mean squared error between predicted probabilities and outcomes',
  },
  {
    term: 'cumulative gains',
    moduleId: 'm25',
    display: 'Cumulative Gains',
    desc: 'Chart showing model performance vs random selection',
  },
  {
    term: 'feature importance',
    moduleId: 'm26',
    display: 'Feature Importance',
    desc: 'How much each input variable contributes to model predictions',
  },
  {
    term: 'SHAP',
    moduleId: 'm26',
    display: 'Feature Importance',
    desc: 'SHapley Additive exPlanations — a unified measure of feature importance',
    wordBoundary: true,
  },
  {
    term: 'bias-variance tradeoff',
    moduleId: 'm27',
    display: 'Bias-Variance Tradeoff',
    desc: 'Balancing underfitting (bias) and overfitting (variance)',
  },
  {
    term: 'overfitting',
    moduleId: 'm27',
    display: 'Bias-Variance Tradeoff',
    desc: 'Model memorizes training data noise instead of the true pattern',
  },
  {
    term: 'underfitting',
    moduleId: 'm27',
    display: 'Bias-Variance Tradeoff',
    desc: 'Model is too simple to capture the underlying pattern',
  },
  {
    term: 'cross-validation',
    moduleId: 'm28',
    display: 'Cross-Validation',
    desc: 'Technique for estimating model performance on unseen data',
  },
  {
    term: 'k-fold',
    moduleId: 'm28',
    display: 'Cross-Validation',
    desc: 'Splitting data into k subsets for repeated training and testing',
  },
  {
    term: 'model drift',
    moduleId: 'm29',
    display: 'Model Drift & Monitoring',
    desc: 'When model performance degrades over time due to changing data',
  },
  {
    term: 'concept drift',
    moduleId: 'm29',
    display: 'Model Drift & Monitoring',
    desc: 'When the relationship between features and target changes',
  },

  // New modules (m30–m34)
  {
    term: 'Bayesian A/B testing',
    moduleId: 'm30',
    display: 'Bayesian A/B Testing',
    desc: 'A/B testing using Bayesian posterior distributions instead of p-values',
  },
  {
    term: 'credible interval',
    moduleId: 'm30',
    display: 'Bayesian A/B Testing',
    desc: 'Bayesian analog of a confidence interval — range where the parameter likely lies',
  },
  {
    term: 'expected loss',
    moduleId: 'm30',
    display: 'Bayesian A/B Testing',
    desc: 'Expected cost of choosing the wrong variant in a Bayesian test',
  },
  {
    term: 'ratio metric',
    moduleId: 'm31',
    display: 'Ratio Metrics & Delta Method',
    desc: 'A metric defined as the ratio of two quantities (e.g., revenue per user)',
  },
  {
    term: 'delta method',
    moduleId: 'm31',
    display: 'Ratio Metrics & Delta Method',
    desc: 'Taylor expansion technique for computing variance of a function of random variables',
  },
  {
    term: 'multi-armed bandit',
    moduleId: 'm32',
    display: 'Multi-Armed Bandits',
    desc: 'Adaptive allocation algorithm that balances exploration and exploitation',
  },
  {
    term: 'Thompson sampling',
    moduleId: 'm32',
    display: 'Multi-Armed Bandits',
    desc: 'Bayesian bandit algorithm that samples from posterior distributions to select arms',
  },
  {
    term: 'UCB1',
    moduleId: 'm32',
    display: 'Multi-Armed Bandits',
    desc: 'Upper Confidence Bound algorithm for multi-armed bandits',
    wordBoundary: true,
  },
  {
    term: 'regret',
    moduleId: 'm32',
    display: 'Multi-Armed Bandits',
    desc: 'Cumulative opportunity cost of not always choosing the optimal arm',
    wordBoundary: true,
  },
  {
    term: 'cluster randomization',
    moduleId: 'm33',
    display: 'Switchback & Cluster Experiments',
    desc: 'Randomizing groups (clusters) rather than individuals to treatment',
  },
  {
    term: 'intra-cluster correlation',
    moduleId: 'm33',
    display: 'Switchback & Cluster Experiments',
    desc: 'Correlation between observations within the same cluster (ICC)',
  },
  {
    term: 'design effect',
    moduleId: 'm33',
    display: 'Switchback & Cluster Experiments',
    desc: 'Factor by which clustering inflates variance relative to individual randomization',
  },
  {
    term: 'switchback experiment',
    moduleId: 'm33',
    display: 'Switchback & Cluster Experiments',
    desc: 'Experiment where clusters alternate between treatment and control over time',
  },
  {
    term: 'bootstrap',
    moduleId: 'm34',
    display: 'Bootstrap & Permutation Tests',
    desc: 'Resampling with replacement to estimate the sampling distribution',
    wordBoundary: true,
  },
  {
    term: 'permutation test',
    moduleId: 'm34',
    display: 'Bootstrap & Permutation Tests',
    desc: 'Non-parametric test that builds a null distribution by shuffling group labels',
  },
  {
    term: 'resampling',
    moduleId: 'm34',
    display: 'Bootstrap & Permutation Tests',
    desc: 'Statistical methods based on repeated sampling from the observed data',
  },
];

export default concepts;
