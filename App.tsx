
import React, { useState, useCallback } from 'react';
import { synthesizeImage } from './services/geminiService';
import { Loader } from './components/Loader';

interface ImageFile {
  file: File;
  preview: string;
}

const App: React.FC = () => {
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([]);
  const [prompt, setPrompt] = useState<string>('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedText, setGeneratedText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const files = Array.from(event.target.files);
      const filePreviews = files.map(file => ({
        file: file,
        preview: URL.createObjectURL(file)
      }));
      setImageFiles(prevFiles => [...prevFiles, ...filePreviews]);
    }
  };

  const removeImage = (index: number) => {
    const newImageFiles = [...imageFiles];
    // Revoke the object URL to prevent memory leaks
    URL.revokeObjectURL(newImageFiles[index].preview);
    newImageFiles.splice(index, 1);
    setImageFiles(newImageFiles);
  };
  
  const clearAllImages = () => {
    imageFiles.forEach(imgFile => URL.revokeObjectURL(imgFile.preview));
    setImageFiles([]);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove "data:image/jpeg;base64," prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = useCallback(async () => {
    if (imageFiles.length === 0 || !prompt.trim()) {
      setError('이미지와 프롬프트를 모두 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);
    setGeneratedText(null);

    try {
      const imageParts = await Promise.all(imageFiles.map(async (imgFile) => {
        const base64Data = await fileToBase64(imgFile.file);
        return {
          mimeType: imgFile.file.type,
          data: base64Data,
        };
      }));

      const result = await synthesizeImage(prompt, imageParts);
      setGeneratedImage(result.imageUrl);
      setGeneratedText(result.text);

    } catch (err: any) {
      setError(`이미지 생성 중 오류가 발생했습니다: ${err.message}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [imageFiles, prompt]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            AI 이미지 합성기
          </h1>
          <p className="mt-2 text-gray-400">여러 이미지와 아이디어를 결합하여 새로운 예술 작품을 만들어보세요.</p>
        </header>

        <main className="space-y-8">
          <div className="bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700">
            <h2 className="text-2xl font-bold mb-4 text-gray-100">1. 이미지 업로드</h2>
            <div className="p-6 border-2 border-dashed border-gray-600 rounded-lg text-center">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer bg-indigo-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors duration-300">
                이미지 선택
              </label>
              <p className="text-xs text-gray-500 mt-2">합성하고 싶은 이미지들을 선택하세요.</p>
            </div>
            {imageFiles.length > 0 && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                   <h3 className="text-lg font-semibold text-gray-300">업로드된 이미지 ({imageFiles.length}개)</h3>
                   <button onClick={clearAllImages} className="text-sm text-red-400 hover:text-red-300 transition-colors">전체 삭제</button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {imageFiles.map((imgFile, index) => (
                    <div key={index} className="relative group">
                      <img src={imgFile.preview} alt={`preview ${index}`} className="w-full h-24 object-cover rounded-md shadow-md" />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove image"
                      >
                        &#x2715;
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700">
            <h2 className="text-2xl font-bold mb-4 text-gray-100">2. 프롬프트 입력</h2>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="예: '첫 번째 이미지의 고양이를 두 번째 이미지의 우주 배경에 합성하고, 세 번째 이미지의 모자를 씌워줘.'"
              className="w-full h-28 p-4 bg-gray-700 border border-gray-600 rounded-md text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            />
          </div>
          
          <div className="text-center">
             <button
                onClick={handleSubmit}
                disabled={isLoading || imageFiles.length === 0 || !prompt.trim()}
                className="w-full max-w-sm px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-lg rounded-lg shadow-lg hover:scale-105 transform transition-transform duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center mx-auto"
              >
                {isLoading ? <Loader /> : '이미지 합성하기'}
              </button>
          </div>

          {error && <div className="mt-6 p-4 bg-red-900/50 border border-red-500 text-red-300 rounded-lg text-center">{error}</div>}

          {isLoading && (
              <div className="mt-8 text-center">
                  <p className="text-lg text-indigo-400 animate-pulse">AI가 이미지를 생성하고 있습니다... 잠시만 기다려주세요.</p>
              </div>
          )}

          {(generatedImage || generatedText) && !isLoading && (
            <div className="mt-8 bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700">
              <h2 className="text-2xl font-bold mb-4 text-center text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-blue-400">
                생성된 결과
              </h2>
              {generatedImage && (
                 <div className="flex justify-center mb-4">
                    <img src={generatedImage} alt="Generated" className="max-w-full h-auto max-h-96 rounded-lg shadow-2xl" />
                 </div>
              )}
              {generatedText && (
                <div className="p-4 bg-gray-700/50 rounded-lg">
                  <p className="text-gray-300 whitespace-pre-wrap">{generatedText}</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
