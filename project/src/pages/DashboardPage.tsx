import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, Wand2, Bot, ShieldCheck, Link, Rocket, ChevronRight, 
  Twitter, Github, Linkedin, Mail, ArrowRight, Cpu, Globe, Lock,
  Copy, CheckCircle, ExternalLink, BookOpen
} from 'lucide-react';

const HERO_SLIDES = [
  {
    tag: "Tính năng mới",
    title: "Tự động hóa AI thế hệ mới",
    desc: "Sử dụng trí tuệ nhân tạo để tự động phân tích và thực hiện các quy trình phức tạp chỉ với một câu lệnh điều hướng.",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=2426",
    color: "from-blue-600/90 to-indigo-600/40"
  },
  {
    tag: "Kết nối không giới hạn",
    title: "Hệ sinh thái 500+ ứng dụng",
    desc: "Đồng bộ dữ liệu mượt mà giữa Slack, Google Sheets, Salesforce và hệ thống nội bộ của bạn trong chớp mắt.",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2340",
    color: "from-emerald-600/90 to-teal-600/40"
  },
  {
    tag: "Bảo mật tuyệt đối",
    title: "An toàn dữ liệu doanh nghiệp",
    desc: "Chúng tôi áp dụng tiêu chuẩn mã hóa quân đội và chứng chỉ SOC2 để đảm bảo mọi luồng dữ liệu của bạn luôn riêng tư.",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=2340",
    color: "from-slate-800/90 to-slate-900/40"
  }
];

export default function DashboardPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [copiedClientId, setCopiedClientId] = useState(false);
  const [copiedClientSecret, setCopiedClientSecret] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const copyToClipboard = (text: string, setCopied: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8 min-h-screen flex flex-col bg-slate-50/50 dark:bg-gray-900">
      {/* Hero Carousel */}
      <section className="relative w-full h-[450px] overflow-hidden rounded-3xl bg-slate-900 shadow-2xl group">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <div className={`absolute inset-0 bg-gradient-to-r ${HERO_SLIDES[currentSlide].color} z-10`}></div>
            <div 
              className="absolute inset-0 bg-cover bg-center scale-105" 
              style={{ backgroundImage: `url('${HERO_SLIDES[currentSlide].image}')` }}
            ></div>
            
            <div className="relative z-20 h-full flex flex-col justify-center px-16 max-w-3xl text-white">
              <motion.span 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase mb-6 w-fit border border-white/20"
              >
                {HERO_SLIDES[currentSlide].tag}
              </motion.span>
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-5xl font-black mb-6 leading-tight"
              >
                {HERO_SLIDES[currentSlide].title}
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-xl text-white/80 mb-8 leading-relaxed font-medium"
              >
                {HERO_SLIDES[currentSlide].desc}
              </motion.p>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex gap-4"
              >
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>
        
        {/* Carousel Indicators */}
        <div className="absolute bottom-8 left-16 z-20 flex gap-3">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`h-1.5 transition-all duration-500 rounded-full ${
                currentSlide === i ? 'w-12 bg-white' : 'w-3 bg-white/30 hover:bg-white/50'
              }`}
            ></button>
          ))}
        </div>
      </section>

      {/* Ưu điểm nổi bật */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        {[
          { icon: Wand2, title: 'Thiết lập kéo thả', desc: 'Xây dựng quy trình tự động trong vài phút mà không cần biết lập trình.', color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: Cpu, title: 'Xử lý dữ liệu thông minh', desc: 'Sử dụng các hàm logic phức tạp để lọc và biến đổi dữ liệu theo ý muốn.', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { icon: Lock, title: 'Kiểm soát toàn diện', desc: 'Quản lý quyền truy cập và lịch sử chạy workflow chi tiết đến từng giây.', color: 'text-slate-600', bg: 'bg-slate-100' },
        ].map((card, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 * (i + 1) }}
            className="bg-white p-8 rounded-2xl border border-slate-200 flex flex-col gap-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            <div className={`${card.bg} ${card.color} h-14 w-14 rounded-xl flex items-center justify-center shrink-0 shadow-inner`}>
              <card.icon size={28} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 mb-2">{card.title}</h3>
              <p className="text-slate-500 leading-relaxed">{card.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quy trình hoạt động */}
      <section className="mt-20 pb-20">
        <div className="flex flex-col items-center text-center mb-16">
          <h2 className="text-4xl font-black text-slate-900 mb-4">Cách thức vận hành</h2>
          <p className="text-slate-500 max-w-2xl text-lg">Tự động hóa công việc của bạn chỉ qua 3 bước đơn giản để tối ưu năng suất lao động.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            { step: '01', title: 'Kết nối ứng dụng', icon: Link, desc: 'Tích hợp các công cụ bạn đang dùng như Gmail, Trello, HubSpot thông qua giao thức bảo mật một chạm.' },
            { step: '02', title: 'Cài đặt Trigger', icon: Zap, desc: "Xác định sự kiện kích hoạt: Ví dụ 'Khi có khách hàng mới đăng ký' hoặc 'Khi nhận được thanh toán'." },
            { step: '03', title: 'Vận hành tự động', icon: Rocket, desc: 'Kích hoạt workflow và để hệ thống thay bạn xử lý công việc 24/7. Theo dõi hiệu quả qua dashboard.' },
          ].map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 * (i + 1) }}
              className="relative group"
            >
              <div className="text-8xl font-black text-slate-100 absolute -top-10 -left-4 z-0 group-hover:text-blue-50 transition-colors duration-500">{item.step}</div>
              <div className="relative z-10">
                <div className="h-16 w-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-8 group-hover:bg-slate-900 group-hover:text-white transition-all duration-500 transform group-hover:rotate-6">
                  <item.icon size={32} />
                </div>
                <h3 className="text-2xl font-black mb-4 text-slate-900">{item.title}</h3>
                <p className="text-slate-500 leading-relaxed text-lg">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Hướng dẫn kết nối Google Cloud */}
      <section className="mt-10 mb-20">
        <div className="flex flex-col items-center text-center mb-12">
          <h2 className="text-4xl font-black text-slate-900 mb-4">Kết nối Gmail & Google Sheets</h2>
          <p className="text-slate-500 max-w-2xl text-lg">Thiết lập ứng dụng Google Cloud trong vài phút để bắt đầu tự động hóa Gmail và Google sheets</p>
        </div>

        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <BookOpen className="text-indigo-600" size={24} />
              <h3 className="text-xl font-bold text-slate-800">Hướng dẫn từng bước</h3>
            </div>
            <p className="text-slate-600 mt-2">Thực hiện theo các bước dưới đây để lấy Client ID và Client Secret cho Gmail và Google Sheets</p>
          </div>

          <div className="p-8 space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">1</div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-800">Tạo dự án trên Google Cloud Console</h4>
                <p className="text-sm text-slate-500 mt-1">Truy cập <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Google Cloud Console</a>, tạo dự án mới (ví dụ: "AI Workflow").</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">2</div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-800">Bật Gmail API và Google Sheets API</h4>
                <p className="text-sm text-slate-500 mt-1">Vào <strong>APIs & Services → Library</strong>, tìm "Gmail API" và bật, sau đó tìm "Google Sheets API" và bật.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">3</div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-800">Cấu hình màn hình đồng ý (OAuth consent screen)</h4>
                <p className="text-sm text-slate-500 mt-1">Chọn <strong>External</strong> (hoặc Internal nếu chỉ dùng nội bộ). Điền thông tin ứng dụng. Sau đó, cuộn xuống mục <strong>Test users</strong>, nhấn <strong>Add users</strong> và thêm email của bạn (ví dụ: doancongchin92@gmail.com).</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">4</div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-800">Tạo OAuth client ID</h4>
                <p className="text-sm text-slate-500 mt-1">Vào <strong>APIs & Services → Credentials</strong>, nhấn <strong>+ Create Credentials → OAuth client ID</strong>. Chọn <strong>Web application</strong>.</p>
                <ul className="list-disc list-inside text-sm text-slate-500 mt-2 space-y-1">
                  <li><strong>Authorized JavaScript origins:</strong> <code className="bg-slate-100 px-1 rounded">http://localhost:3000</code></li>
                  <li><strong>Authorized redirect URIs:</strong> <code className="bg-slate-100 px-1 rounded">http://localhost:3001/api/auth/callback</code></li>
                </ul>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">5</div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-800">Sao chép Client ID và Client Secret</h4>
                <p className="text-sm text-slate-500 mt-1">Sau khi tạo, bạn sẽ thấy hộp thoại hiện Client ID và Client Secret. Hãy copy và lưu lại.</p>
                <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-700">Client ID (ví dụ)</span>
                    <button
                      onClick={() => copyToClipboard("1058060673413-es4bnnec90l6ndce6vm04fk6q1svp27a.apps.googleusercontent.com", setCopiedClientId)}
                      className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 text-sm"
                    >
                      {copiedClientId ? <CheckCircle size={16} /> : <Copy size={16} />}
                      {copiedClientId ? "Đã sao chép" : "Sao chép"}
                    </button>
                  </div>
                  <code className="text-xs bg-white p-2 block rounded border border-slate-200 font-mono break-all">
                    1058060673413-es4bnnec90l6ndce6vm04fk6q1svp27a.apps.googleusercontent.com
                  </code>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-sm font-medium text-slate-700">Client Secret (ví dụ)</span>
                    <button
                      onClick={() => copyToClipboard("GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx", setCopiedClientSecret)}
                      className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 text-sm"
                    >
                      {copiedClientSecret ? <CheckCircle size={16} /> : <Copy size={16} />}
                      {copiedClientSecret ? "Đã sao chép" : "Sao chép"}
                    </button>
                  </div>
                  <code className="text-xs bg-white p-2 mt-2 block rounded border border-slate-200 font-mono break-all">
                    GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx
                  </code>
                  <p className="text-xs text-slate-400 mt-2">⚠️ Lưu ý: Đây là placeholder. Hãy thay bằng Client Secret thực tế từ Google Cloud Console.</p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">6</div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-800">(Tùy chọn) Thêm scope cho Google Sheets vào OAuth consent screen</h4>
                <p className="text-sm text-slate-500 mt-1">Để ghi dữ liệu vào Google Sheets, bạn cần thêm scope <code className="bg-slate-100 px-1 rounded">https://www.googleapis.com/auth/spreadsheets</code> vào màn hình đồng ý. Vào <strong>APIs & Services → OAuth consent screen → Data access</strong>, nhấn <strong>Add or remove scopes</strong>, tìm và chọn scope của Sheets.</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4">
              <p className="text-sm text-blue-800">✅ Sau khi hoàn tất, bạn có thể quay lại trang <strong>Kết nối</strong> trong Profile, nhấn "Kết nối" cho Gmail và Google Sheets. Hệ thống sẽ yêu cầu bạn đăng nhập Google và cấp quyền.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white pt-20 pb-12 -mx-8 -mb-8 px-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                  <Zap size={24} className="text-white" fill="currentColor" />
                </div>
                <span className="text-2xl font-black text-slate-900 tracking-tighter">AutoFlow.vn</span>
              </div>
              <p className="text-slate-500 leading-relaxed">
                Nền tảng tự động hóa mạnh mẽ nhất cho các đội ngũ hiện đại. Xây dựng, triển khai và mở rộng quy trình không giới hạn.
              </p>
              <div className="flex gap-4">
                {[Twitter, Github, Linkedin, Mail].map((Icon, i) => (
                  <a key={i} href="#" className="h-10 w-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-indigo-600 hover:text-white transition-all">
                    <Icon size={20} />
                  </a>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest mb-8">Sản phẩm</h4>
              <ul className="space-y-4">
                {['Tính năng', 'Tích hợp', 'Bảng giá', 'Cập nhật', 'Lộ trình'].map((link) => (
                  <li key={link}>
                    <a href="#" className="text-slate-500 hover:text-indigo-600 transition-colors font-medium">{link}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest mb-8">Hỗ trợ</h4>
              <ul className="space-y-4">
                {['Tài liệu', 'API Reference', 'Cộng đồng', 'Hướng dẫn', 'Liên hệ'].map((link) => (
                  <li key={link}>
                    <a href="#" className="text-slate-500 hover:text-indigo-600 transition-colors font-medium">{link}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100">
              <h4 className="font-black text-slate-900 mb-4">Nhận tin mới nhất</h4>
              <p className="text-sm text-slate-500 mb-6">Đăng ký để nhận các mẹo tự động hóa và cập nhật nền tảng sớm nhất.</p>
              <div className="flex flex-col gap-3">
                <input 
                  type="email" 
                  placeholder="Email của bạn" 
                  className="bg-white border border-slate-200 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600/20 transition-all text-sm"
                />
                <button className="bg-indigo-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all text-sm">
                  Đăng ký ngay
                </button>
              </div>
            </div>
          </div>
          
          <div className="pt-12 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-sm text-slate-400 font-medium">© 2026 AutoFlow Inc. Bảo lưu mọi quyền.</p>
            <div className="flex gap-8">
              <a href="#" className="text-sm text-slate-400 hover:text-slate-900 transition-colors font-medium">Chính sách bảo mật</a>
              <a href="#" className="text-sm text-slate-400 hover:text-slate-900 transition-colors font-medium">Điều khoản dịch vụ</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}