import { UtpFinancialRules } from './utp/UtpFinancialRules';
import { registerFinancialRules } from './financialRulesRegistry';

registerFinancialRules({ id: 'utp', create: () => new UtpFinancialRules() });
