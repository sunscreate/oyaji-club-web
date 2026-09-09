import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from './components/Layout'
import { RequireAuth, RequireStaff } from './components/guards'
import Login from './pages/Login'
import Signup from './pages/Signup'
import RegisterProfile from './pages/RegisterProfile'
import Guide from './pages/Guide'
import Home from './pages/Home'
import Events from './pages/Events'
import EventDetail from './pages/EventDetail'
import EventPhotos from './pages/EventPhotos'
import EventSurvey from './pages/EventSurvey'
import PhotosIndex from './pages/PhotosIndex'
import AnnualPlan from './pages/AnnualPlan'
import About from './pages/About'
import Feedback from './pages/Feedback'
import RolesHistory from './pages/RolesHistory'
import PastEvents from './pages/PastEvents'
import News from './pages/News'
import MyPage from './pages/mypage/MyPage'
import MyProfile from './pages/mypage/MyProfile'
import Household from './pages/mypage/Household'
import Children from './pages/mypage/Children'
import Allergy from './pages/mypage/Allergy'
import StaffDashboard from './pages/staff/StaffDashboard'
import StaffHome from './pages/staff/StaffHome'
import StaffEventForm from './pages/staff/StaffEventForm'
import StaffEventHub from './pages/staff/StaffEventHub'
import StaffParticipants from './pages/staff/StaffParticipants'
import StaffPrep from './pages/staff/StaffPrep'
import StaffReceipts from './pages/staff/StaffReceipts'
import StaffReception from './pages/staff/StaffReception'
import StaffAccounting from './pages/staff/StaffAccounting'
import StaffSurveyEditor from './pages/staff/StaffSurveyEditor'
import StaffSurveyResults from './pages/staff/StaffSurveyResults'
import StaffFeedback from './pages/staff/StaffFeedback'
import StaffRoles from './pages/staff/StaffRoles'
import StaffEventResults from './pages/staff/StaffEventResults'
import StaffAnnouncements from './pages/staff/StaffAnnouncements'
import StaffOyajiMembers from './pages/staff/StaffOyajiMembers'
import StaffMembers from './pages/staff/StaffMembers'
import StaffClasses from './pages/staff/StaffClasses'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/guide" replace />} />
      <Route path="/login" element={<Guide />} />
      <Route path="/signin" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/register" element={<RegisterProfile />} />
      <Route path="/guide" element={<Guide />} />

      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route path="/home" element={<Home />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/events/:id/photos" element={<EventPhotos />} />
        <Route path="/events/:id/survey" element={<EventSurvey />} />
        <Route path="/annual" element={<AnnualPlan />} />
        <Route path="/past" element={<PastEvents />} />
        <Route path="/roles" element={<RolesHistory />} />
        <Route path="/about" element={<About />} />
        <Route path="/photos" element={<PhotosIndex />} />
        <Route path="/news" element={<News />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/mypage/profile" element={<MyProfile />} />
        <Route path="/mypage/household" element={<Household />} />
        <Route path="/mypage/children" element={<Children />} />
        <Route path="/mypage/allergy" element={<Allergy />} />
      </Route>

      <Route element={<RequireStaff><AppLayout /></RequireStaff>}>
        <Route path="/staff" element={<StaffDashboard />} />
        <Route path="/staff/events" element={<StaffHome />} />
        <Route path="/staff/events/new" element={<StaffEventForm />} />
        <Route path="/staff/events/:id" element={<StaffEventHub />} />
        <Route path="/staff/events/:id/edit" element={<StaffEventForm />} />
        <Route path="/staff/events/:id/participants" element={<StaffParticipants />} />
        <Route path="/staff/events/:id/prep" element={<StaffPrep />} />
        <Route path="/staff/events/:id/receipts" element={<StaffReceipts />} />
        <Route path="/staff/events/:id/reception" element={<StaffReception />} />
        <Route path="/staff/events/:id/accounting" element={<StaffAccounting />} />
        <Route path="/staff/events/:id/survey" element={<StaffSurveyEditor />} />
        <Route path="/staff/events/:id/survey-results" element={<StaffSurveyResults />} />
        <Route path="/staff/events/:id/results" element={<StaffEventResults />} />
        <Route path="/staff/oyaji" element={<StaffOyajiMembers />} />
        <Route path="/staff/members" element={<StaffMembers />} />
        <Route path="/staff/feedback" element={<StaffFeedback />} />
        <Route path="/staff/roles" element={<StaffRoles />} />
        <Route path="/staff/announcements" element={<StaffAnnouncements />} />
        <Route path="/staff/classes" element={<StaffClasses />} />
      </Route>

      <Route path="*" element={<Navigate to="/guide" replace />} />
    </Routes>
  )
}
