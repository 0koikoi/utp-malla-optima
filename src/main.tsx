import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import './styles/integration.css'
import './styles/theme.css'
import App from './App.tsx'
import { FinancialPlanningContext } from './financial/FinancialPlanningContext'
import { FinancialPlanningService } from './financial/services/FinancialPlanningService'
import { UniversityFinancialRulesProvider } from './financial/rules/UniversityFinancialRulesProvider'

const financialPlanningService = new FinancialPlanningService(new UniversityFinancialRulesProvider())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FinancialPlanningContext.Provider value={financialPlanningService}>
      <App />
    </FinancialPlanningContext.Provider>
  </StrictMode>,
)
