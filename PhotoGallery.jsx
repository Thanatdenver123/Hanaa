import React, { useState, useRef, useEffect } from 'react';
import { Search, Upload, Grid3x3, Image, X, Loader2 } from 'lucide-react';

const PhotoGallery = () => {
  const [photos, setPhotos] = useState([]);
  const [filteredPhotos, setFilteredPhotos] = useState([]);
  const [searchImage, setSearchImage] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const fileInputRef = useRef(null);
  const searchInputRef = useRef(null);
  const [faceApiLoaded, setFaceApiLoaded] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // โหลด face-api.js
  useEffect(() => {
    const loadFaceApi = async () => {
      try {
        setLoadingMessage('กำลังโหลด Face Detection API...');
        
        // โหลด face-api.js
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/dist/face-api.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });

        // รอให้ faceapi พร้อม
        await new Promise(resolve => setTimeout(resolve, 500));

        setLoadingMessage('กำลังโหลดโมเดล AI...');
        
        // โหลดโมเดล
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        
        setFaceApiLoaded(true);
        setLoadingMessage('');
      } catch (error) {
        console.error('Error loading face-api:', error);
        setLoadingMessage('ไม่สามารถโหลด Face Detection API ได้');
      }
    };

    loadFaceApi();
  }, []);

  // อัพโหลดรูปภาพ
  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    const newPhotos = files.map(file => ({
      id: Date.now() + Math.random(),
      url: URL.createObjectURL(file),
      file: file,
      name: file.name
    }));
    
    setPhotos(prev => [...prev, ...newPhotos]);
    setFilteredPhotos(prev => [...prev, ...newPhotos]);
  };

  // ค้นหาใบหน้า
  const handleSearchImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!faceApiLoaded) {
      alert('กรุณารอสักครู่ ระบบกำลังโหลด Face Detection API');
      return;
    }

    setSearchImage(URL.createObjectURL(file));
    setIsSearching(true);
    setLoadingMessage('กำลังวิเคราะห์ใบหน้า...');

    try {
      // สร้าง image element สำหรับรูปค้นหา
      const searchImg = await loadImage(URL.createObjectURL(file));
      const searchDetection = await faceapi
        .detectSingleFace(searchImg)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!searchDetection) {
        alert('ไม่พบใบหน้าในรูปที่เลือก กรุณาลองใหม่');
        setIsSearching(false);
        setLoadingMessage('');
        return;
      }

      setLoadingMessage('กำลังค้นหาใบหน้าที่ตรงกัน...');

      // เปรียบเทียบกับรูปทั้งหมด
      const matches = [];
      for (const photo of photos) {
        const img = await loadImage(photo.url);
        const detections = await faceapi
          .detectAllFaces(img)
          .withFaceLandmarks()
          .withFaceDescriptors();

        for (const detection of detections) {
          const distance = faceapi.euclideanDistance(
            searchDetection.descriptor,
            detection.descriptor
          );

          // ถ้า distance น้อยกว่า 0.6 แสดงว่าเป็นคนเดียวกัน
          if (distance < 0.6) {
            matches.push({
              ...photo,
              similarity: (1 - distance) * 100
            });
            break;
          }
        }
      }

      setFilteredPhotos(matches.sort((a, b) => b.similarity - a.similarity));
      setLoadingMessage('');
      
      if (matches.length === 0) {
        alert('ไม่พบรูปที่ตรงกัน');
      }
    } catch (error) {
      console.error('Error searching faces:', error);
      alert('เกิดข้อผิดพลาดในการค้นหา');
      setLoadingMessage('');
    }

    setIsSearching(false);
  };

  // โหลดรูปภาพ
  const loadImage = (url) => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  };

  // รีเซ็ตการค้นหา
  const resetSearch = () => {
    setSearchImage(null);
    setFilteredPhotos(photos);
  };

  // ลบรูป
  const deletePhoto = (id) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
    setFilteredPhotos(prev => prev.filter(p => p.id !== id));
    if (selectedPhoto?.id === id) {
      setSelectedPhoto(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Photo Gallery
            </h1>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100'}`}
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100'}`}
              >
                <Image className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Upload & Search Bar */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition"
            >
              <Upload className="w-4 h-4" />
              อัพโหลดรูป
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />

            <button
              onClick={() => searchInputRef.current?.click()}
              disabled={!faceApiLoaded || photos.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <Search className="w-4 h-4" />
              ค้นหาด้วยใบหน้า
            </button>
            <input
              ref={searchInputRef}
              type="file"
              accept="image/*"
              onChange={handleSearchImage}
              className="hidden"
            />

            {searchImage && (
              <button
                onClick={resetSearch}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                <X className="w-4 h-4" />
                ล้างการค้นหา
              </button>
            )}

            <div className="flex-1 flex items-center justify-end text-sm text-gray-600">
              {photos.length > 0 && (
                <span>รูปทั้งหมด: {photos.length} | แสดง: {filteredPhotos.length}</span>
              )}
            </div>
          </div>

          {/* Loading Message */}
          {loadingMessage && (
            <div className="mt-3 flex items-center gap-2 text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{loadingMessage}</span>
            </div>
          )}

          {/* Search Preview */}
          {searchImage && (
            <div className="mt-3 flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <img src={searchImage} alt="Search" className="w-16 h-16 object-cover rounded-lg" />
              <div>
                <p className="font-semibold text-blue-900">กำลังค้นหาใบหน้านี้</p>
                <p className="text-sm text-blue-700">พบ {filteredPhotos.length} รูปที่ตรงกัน</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Gallery */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {photos.length === 0 ? (
          <div className="text-center py-20">
            <Upload className="w-20 h-20 mx-auto text-gray-300 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-400 mb-2">ยังไม่มีรูปภาพ</h2>
            <p className="text-gray-400 mb-6">คลิกปุ่ม "อัพโหลดรูป" เพื่อเริ่มต้น</p>
            {!faceApiLoaded && (
              <p className="text-sm text-blue-600">กำลังโหลดระบบค้นหาใบหน้า...</p>
            )}
          </div>
        ) : filteredPhotos.length === 0 ? (
          <div className="text-center py-20">
            <Search className="w-20 h-20 mx-auto text-gray-300 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-400 mb-2">ไม่พบรูปที่ตรงกัน</h2>
            <p className="text-gray-400">ลองค้นหาด้วยรูปอื่น หรือคลิก "ล้างการค้นหา"</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' 
            : 'grid grid-cols-1 md:grid-cols-2 gap-6'
          }>
            {filteredPhotos.map(photo => (
              <div
                key={photo.id}
                className="group relative bg-white rounded-xl shadow-md overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:scale-105"
                onClick={() => setSelectedPhoto(photo)}
              >
                <div className={viewMode === 'grid' ? 'aspect-square' : 'aspect-video'}>
                  <img
                    src={photo.url}
                    alt={photo.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-white text-sm truncate">{photo.name}</p>
                    {photo.similarity && (
                      <p className="text-green-300 text-xs mt-1">
                        ความคล้าย: {photo.similarity.toFixed(1)}%
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePhoto(photo.id);
                    }}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={selectedPhoto.url}
            alt={selectedPhoto.name}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 left-4 right-4 text-center text-white">
            <p className="text-lg font-semibold">{selectedPhoto.name}</p>
            {selectedPhoto.similarity && (
              <p className="text-green-300 text-sm mt-1">
                ความคล้าย: {selectedPhoto.similarity.toFixed(1)}%
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoGallery;