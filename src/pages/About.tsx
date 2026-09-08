import { PageTitle, Card } from '../components/ui'
import logo from '../assets/logo.jpg'

export default function About() {
  return (
    <div>
      <PageTitle>おやじ倶楽部について</PageTitle>
      <Card>
        <img src={logo} alt="おやじ倶楽部" className="mx-auto mb-4 w-48 rounded-lg" />
        <p className="whitespace-pre-wrap leading-relaxed text-gray-800">
          このサイトはさぎぬま幼稚園「おやじ倶楽部」が運営しています。{'\n'}
          おやじ倶楽部に加入していない方でも、在園児の保護者であれば登録・利用できます（父・母どちらでも、OBの方も歓迎です）。{'\n\n'}
          年間予定やイベントの告知・参加確認、写真の共有などをこの1か所にまとめています。
        </p>
      </Card>
    </div>
  )
}
