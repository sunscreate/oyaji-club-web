import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from './components/Layout'
import { RequireAuth, RequireStaff } from './components/guards'
import Login from './pages/Login'
import Signup from './pages/Signup'
import RegisterProfile from './pages/RegisterProfile'
import Home from './pages/Home'
import Events from './pages/Events'
import EventDetail from './pages/EventDetail'
import AnnualPlan from './pages/AnnualPlan'
import About from './pages/About'
import Placeholder from './pages/Placeholder'
import MyPage from './pages/mypage/MyPage'
import MyProfile from './pages/mypage/MyProfile'
import Household from './pages/mypage/Household'
import Children from './pages/mypage/Children'
import Allergy from './pages/mypage/Allergy'
import StaffHome from './pages/staff/StaffHome'
import StaffEventForm from './pages/staff/StaffEventForm'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/register" element={<RegisterProfile />} />

      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route path="/" element={<Home />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/annual" element={<AnnualPlan />} />
        <Route path="/about" element={<About />} />
        <Route path="/photos" element={<Placeholder title="写真" note="写真共有はフェーズ2で追加されます。" />} />
        <Route path="/news" element={<Placeholder title="お知らせ" />} />
        <Route path="/feedback" element={<Placeholder title="ご意見・ご質問" />} />
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/mypage/profile" element={<MyProfile />} />
        <Route path="/mypage/household" element={<Household />} />
        <Route path="/mypage/children" element={<Children />} />
        <Route path="/mypage/allergy" element={<Allergy />} />
      </Route>

      <Route element={<RequireStaff><AppLayout /></RequireStaff>}>
        <Route path="/staff" element={<StaffHome />} />
        <Route path="/staff/events/new" element={<StaffEventForm />} />
        <Route path="/staff/events/:id/edit" element={<StaffEventForm />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
