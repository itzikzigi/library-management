import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { RequireAuth } from './components/RequireAuth'
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
          {/* Public — guest browsing allowed */}
          <Route path="/" element={<CatalogPage />} />
          <Route path="/book/:id" element={<BookDetailPage />} />

          {/* Reader-only (any authed user) */}
          <Route
            path="/recommendations"
            element={
              <RequireAuth>
                <RecommendationsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/my-loans"
            element={
              <RequireAuth>
                <MyLoansPage />
              </RequireAuth>
            }
          />

          {/* Librarian-only */}
          <Route
            path="/librarian"
            element={
              <RequireAuth role="LIBRARIAN">
                <LibrarianDashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/librarian/books"
            element={
              <RequireAuth role="LIBRARIAN">
                <LibrarianBooks />
              </RequireAuth>
            }
          />
          <Route
            path="/librarian/members"
            element={
              <RequireAuth role="LIBRARIAN">
                <LibrarianMembers />
              </RequireAuth>
            }
          />
          <Route
            path="/librarian/loans"
            element={
              <RequireAuth role="LIBRARIAN">
                <LibrarianLoans />
              </RequireAuth>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
