export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Sadece POST istekleri kabul edilir.' });
  }

  const { adminEmail, newData } = req.body;

  // Güvenlik Doğrulaması
  if (adminEmail !== 'm53g@gmail.com') {
    return res.status(403).json({ message: 'Yetkisiz erişim.' });
  }

  const GITHUB_TOKEN = process.env.GH_PAT_TOKEN;
  const REPO_OWNER = 'bwmm402-commits';
  const REPO_NAME = 'vercell';
  const FILE_PATH = 'data.json';

  try {
    // 1. Mevcut dosyanın SHA değerini al (GitHub API zorunluluğu)
    const getFileRes = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    const fileData = await getFileRes.json();
    const currentSha = fileData.sha;

    // 2. data.json dosyasını yeni verilerle güncelle
    const updatedContent = Buffer.from(JSON.stringify(newData, null, 2)).toString('base64');

    const updateRes = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `auto-backup: M53G V7 data update [${new Date().toISOString()}]`,
          content: updatedContent,
          sha: currentSha,
        }),
      }
    );

    if (updateRes.ok) {
      return res.status(200).json({ success: true, message: 'Yedekleme ve GitHub commit işlemi başarılı!' });
    } else {
      throw new Error('GitHub API güncelleme hatası');
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
