import { UtpFinancialConfigProvider } from './utp/UtpFinancialConfigProvider';
import { registerFinancialSource } from './financialSourceRegistry';

registerFinancialSource({ reglasFinancierasId: 'utp', load: (selection) => UtpFinancialConfigProvider.load(selection) });
