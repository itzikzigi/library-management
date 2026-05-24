import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { LoginPage } from './pages/auth/Login'
import { RegisterPage } from './pages/auth/Register'
import { CatalogPage } from './pages/reader/Catalog'
import { BookDetailPage } from './pages/reader/BookDetail'
import { RecommendationsPage } from './pages/reader/Recommendations'
import { MyLoansPage } from './pages/reader/MyLoans'
import { LibrarianDashboard } from './pages/librarian/Dashboard'
import { LibrarianBooks } from './pages/librarian/Books'
import { LibrarianMembers } from './pages/librarian/Members'
import { LibrarianLoans } from './pages/librarian/Loans'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<AppShell />}>
          <Route path="/" element={<CatalogPage />} />
          <Route path="/book/:id" element={<BookDetailPage />} />
          <Route path="/recommendations" element={<RecommendationsPage />} />
          <Route path="/my-loans" element={<MyLoansPage />} />
          <Route path="/librarian" element={<LibrarianDashboard />} />
          <Route path="/librarian/books" element={<LibrarianBooks />} />
          <Route path="/librarian/members" element={<LibrarianMembers />} />
          <Route path="/librarian/loans" element={<LibrarianLoans />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
