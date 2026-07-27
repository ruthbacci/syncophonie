import { useState } from 'react'
import { useAuth } from '../api/AuthContext'
import api from '../api/client'
import './SettingsPage.css'

export default function SettingsPage() {
  const { user, updateUser } = useAuth()
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [nameMsg, setNameMsg] = useState('')

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [pwError, setPwError] = useState('')

  async function handleNameSave(e) {
    e.preventDefault()
    setNameMsg('')
    try {
      const { data } = await api.put('/auth/display-name', { displayName })
      updateUser(data.user, data.token)
      setNameMsg('Display name updated!')
    } catch (err) {
      setNameMsg(err.response?.data?.error || 'Error saving name')
    }
  }

  async function handlePasswordSave(e) {
    e.preventDefault()
    setPwMsg('')
    setPwError('')
    if (newPw !== confirmPw) {
      setPwError('New passwords do not match')
      return
    }
    try {
      await api.put('/auth/password', { currentPassword: currentPw, newPassword: newPw })
      setPwMsg('Password changed successfully!')
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
    } catch (err) {
      setPwError(err.response?.data?.error || 'Error changing password')
    }
  }

  return (
    <div className="settings-page">
      <h2 className="page-title" style={{ marginBottom: '24px' }}>Settings</h2>

      <div className="settings-card">
        <h3 className="settings-section-title">Display Name</h3>
        <p className="settings-desc">This is the name other quartet members see for you.</p>
        <form onSubmit={handleNameSave} className="settings-form">
          <div className="field">
            <label htmlFor="displayName">Display Name</label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary small">Save Name</button>
          {nameMsg && <p className="settings-msg">{nameMsg}</p>}
        </form>
      </div>

      <div className="settings-card">
        <h3 className="settings-section-title">Change Password</h3>
        <p className="settings-desc">Passwords must be at least 8 characters.</p>
        <form onSubmit={handlePasswordSave} className="settings-form">
          <div className="field">
            <label htmlFor="currentPw">Current Password</label>
            <input
              id="currentPw"
              type="password"
              value={currentPw}
              onChange={e => setCurrentPw(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <div className="field">
            <label htmlFor="newPw">New Password</label>
            <input
              id="newPw"
              type="password"
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="field">
            <label htmlFor="confirmPw">Confirm New Password</label>
            <input
              id="confirmPw"
              type="password"
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          {pwError && <p className="settings-error">{pwError}</p>}
          <button type="submit" className="btn-primary small">Change Password</button>
          {pwMsg && <p className="settings-msg">{pwMsg}</p>}
        </form>
      </div>
    </div>
  )
}
