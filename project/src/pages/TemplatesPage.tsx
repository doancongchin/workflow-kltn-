import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { MoreVertical, Play, Clock, Zap, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import LoginPromptModal from '../components/nodes/modals/LoginPromptModal';

interface Template {
  TemplateId: number;
  Title: string;
  Description: string;
  Status: string;
  Steps: number;
  ImageUrl: string | null;
  Category: string | null;
  CreatedAt: string;
}

interface TemplatesPageProps {
  isAuthenticated: boolean;
}

export default function TemplatesPage({ isAuthenticated }: TemplatesPageProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const templatesPerPage = 9; // Số template mỗi trang
  const navigate = useNavigate();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTemplate = (templateId: number) => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    navigate(`/builder?templateId=${templateId}`);
  };

  // Lọc theo từ khóa
  const filteredTemplates = templates.filter(template =>
    template.Title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.Description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Reset về trang 1 khi tìm kiếm
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Tính toán phân trang
  const indexOfLastTemplate = currentPage * templatesPerPage;
  const indexOfFirstTemplate = indexOfLastTemplate - templatesPerPage;
  const currentTemplates = filteredTemplates.slice(indexOfFirstTemplate, indexOfLastTemplate);
  const totalPages = Math.ceil(filteredTemplates.length / templatesPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  const goToPrevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);
  const goToNextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#2b5bee] border-r-transparent"></div>
          <p className="mt-4 text-slate-600 font-medium">Đang tải templates...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <h1 className="text-4xl font-black bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Kho Mẫu
            </h1>
            <p className="text-slate-500 mt-2 text-lg">Chọn một template để bắt đầu xây dựng workflow của bạn</p>

            <div className="mt-6 relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Tìm kiếm template..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-[#2b5bee] focus:border-transparent outline-none transition-all shadow-sm"
              />
            </div>
          </motion.div>

          {currentTemplates.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <p className="text-slate-400 text-lg">Không tìm thấy template nào phù hợp.</p>
            </motion.div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {currentTemplates.map((template, index) => (
                  <motion.div
                    key={template.TemplateId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -4 }}
                    className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-500/30 transition-all duration-300"
                  >
                    <div className="aspect-video relative bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
                      <img
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        src={template.ImageUrl || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2340'}
                        alt={template.Title}
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="absolute top-3 right-3">
                        <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-lg ${
                          template.Status === 'Active'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-amber-500 text-white'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${template.Status === 'Active' ? 'bg-white' : 'bg-white'}`}></span>
                          {template.Status === 'Active' ? 'Hoạt động' : 'Bản nháp'}
                        </span>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-xl text-slate-800 group-hover:text-[#2b5bee] transition-colors line-clamp-1">
                          {template.Title}
                        </h3>
                        <button className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                          <MoreVertical size={18} />
                        </button>
                      </div>
                      <p className="text-sm text-slate-600 mb-4 line-clamp-2">{template.Description}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500 mb-6">
                        <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-full">
                          <Clock size={14} />
                          <span>{new Date(template.CreatedAt).toLocaleDateString('vi-VN')}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-full">
                          <Zap size={14} />
                          <span>{template.Steps} bước</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditTemplate(template.TemplateId)}
                          className="flex-1 bg-gradient-to-r from-[#2b5bee] to-blue-500 text-white py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:scale-[1.02] transition-all"
                        >
                          Sử dụng template
                        </button>
                        <button className="p-2.5 border border-slate-200 rounded-xl hover:border-[#2b5bee] text-slate-500 hover:text-[#2b5bee] transition-colors">
                          <Play size={18} fill="currentColor" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-200 pt-8 mt-12">
                  <p className="text-sm text-slate-500">
                    Hiển thị <span className="font-semibold">{currentTemplates.length}</span> / <span className="font-semibold">{filteredTemplates.length}</span> template
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={goToPrevPage}
                      disabled={currentPage === 1}
                      className="p-2 rounded-xl hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-200"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
                      <button
                        key={number}
                        onClick={() => paginate(number)}
                        className={`h-10 w-10 rounded-xl text-sm font-bold transition-all ${
                          currentPage === number
                            ? 'bg-[#2b5bee] text-white shadow-md'
                            : 'hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {number}
                      </button>
                    ))}
                    <button
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-xl hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-200"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <LoginPromptModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </>
  );
}