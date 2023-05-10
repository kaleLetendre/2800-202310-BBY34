import Link from 'next/link'

const Header = () => {
  return (
    <header className="header">
      <div className="container">
        <div className="logo">
          <Link href="/">Synerift</Link>
        </div>
        <div className="links">
          <Link href="/teams">Teams</Link>
          <Link href="/profile">Profile</Link>
        </div>
      </div>
    </header>
  )
}

export default Header;