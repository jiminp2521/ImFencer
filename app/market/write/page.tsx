'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ImagePlus, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function MarketWritePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const editId = searchParams.get('edit');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [weaponType, setWeaponType] = useState('Epee');
  const [brand, setBrand] = useState('');
  const [condition, setCondition] = useState('중고');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingEditData, setLoadingEditData] = useState(Boolean(editId));
  const [loadedEditId, setLoadedEditId] = useState<string | null>(null);

  const imagePreviewUrl = useMemo(() => {
    if (!imageFile) return null;
    return URL.createObjectURL(imageFile);
  }, [imageFile]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  useEffect(() => {
    const loadEditData = async () => {
      if (!editId) {
        setLoadingEditData(false);
        return;
      }

      if (loadedEditId === editId) {
        setLoadingEditData(false);
        return;
      }

      setLoadingEditData(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert('로그인이 필요합니다.');
        router.push(`/login?next=/market/write?edit=${editId}`);
        return;
      }

      const { data: item, error } = await supabase
        .from('market_items')
        .select('id, seller_id, title, description, price, weapon_type, brand, condition, image_url')
        .eq('id', editId)
        .eq('seller_id', user.id)
        .single();

      if (error || !item) {
        console.error('Error loading market item to edit:', error);
        alert('수정할 판매글을 찾을 수 없습니다.');
        router.push('/market');
        return;
      }

      setTitle(item.title || '');
      setDescription(item.description || '');
      setPrice(String(item.price || ''));
      setWeaponType(item.weapon_type || 'Epee');
      setBrand(item.brand || '');
      setCondition(item.condition || '중고');
      setImageUrlInput(item.image_url || '');
      setLoadedEditId(editId);
      setLoadingEditData(false);
    };

    loadEditData();
  }, [editId, loadedEditId, router, supabase]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      alert('가격을 올바르게 입력해주세요.');
      return;
    }

    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert('로그인이 필요합니다.');
      router.push('/login?next=/market/write');
      setSubmitting(false);
      return;
    }

    let finalImageUrl = imageUrlInput.trim() || null;

    if (imageFile) {
      const extension = imageFile.name.includes('.') ? imageFile.name.split('.').pop() : 'jpg';
      const safeExtension = extension ? extension.toLowerCase() : 'jpg';
      const filePath = `market/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${safeExtension}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError || !uploadData) {
        console.error('Error uploading market image:', uploadError);
        alert('이미지 업로드에 실패했습니다.');
        setSubmitting(false);
        return;
      }

      const { data: publicData } = supabase.storage.from('images').getPublicUrl(uploadData.path);
      finalImageUrl = publicData.publicUrl;
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      price: Math.round(numericPrice),
      weapon_type: weaponType,
      brand: brand.trim() || null,
      condition,
      image_url: finalImageUrl,
    };

    const { data, error } = editId
      ? await supabase
          .from('market_items')
          .update(payload)
          .eq('id', editId)
          .eq('seller_id', user.id)
          .select('id')
          .single()
      : await supabase
          .from('market_items')
          .insert({
            seller_id: user.id,
            ...payload,
            status: 'selling',
          })
          .select('id')
          .single();

    if (error || !data) {
      console.error('Error saving market item:', error);
      alert(editId ? '판매글 수정에 실패했습니다.' : '판매글 등록에 실패했습니다.');
      setSubmitting(false);
      return;
    }

    router.push(`/market/${data.id}`);
    router.refresh();
  };

  return (
    <div className="min-h-screen pb-20 bg-black">
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur border-b border-white/10 h-14 px-4 flex items-center justify-between">
        <Link href={editId ? `/market/${editId}` : '/market'} className="text-gray-400 hover:text-white transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-base font-semibold text-white">{editId ? '판매글 수정' : '판매글 등록'}</h1>
        <div className="w-6" />
      </header>

      <main className="p-4">
        {loadingEditData ? (
          <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <p className="text-sm">판매글 정보를 불러오는 중입니다.</p>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="상품명"
            className="border-gray-800 bg-gray-950 text-gray-100 placeholder:text-gray-500"
            required
            maxLength={80}
          />

          <Input
            value={price}
            onChange={(event) => setPrice(event.target.value.replace(/[^0-9]/g, ''))}
            placeholder="가격 (원)"
            className="border-gray-800 bg-gray-950 text-gray-100 placeholder:text-gray-500"
            inputMode="numeric"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select value={weaponType} onValueChange={setWeaponType}>
              <SelectTrigger className="border-gray-800 bg-gray-950 text-gray-100">
                <SelectValue placeholder="종목" />
              </SelectTrigger>
              <SelectContent className="bg-gray-950 border-gray-800 text-gray-100">
                <SelectItem value="Epee">에페</SelectItem>
                <SelectItem value="Sabre">사브르</SelectItem>
                <SelectItem value="Fleuret">플뢰레</SelectItem>
              </SelectContent>
            </Select>

            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger className="border-gray-800 bg-gray-950 text-gray-100">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent className="bg-gray-950 border-gray-800 text-gray-100">
                <SelectItem value="미개봉">미개봉</SelectItem>
                <SelectItem value="거의 새것">거의 새것</SelectItem>
                <SelectItem value="중고">중고</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Input
            value={brand}
            onChange={(event) => setBrand(event.target.value)}
            placeholder="브랜드 (선택)"
            className="border-gray-800 bg-gray-950 text-gray-100 placeholder:text-gray-500"
            maxLength={40}
          />

          <div className="space-y-2">
            <label
              htmlFor="market-image-file"
              className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-gray-700 bg-gray-950 py-4 text-sm text-gray-300 hover:border-gray-500 hover:text-gray-200 transition-colors"
            >
              <ImagePlus className="w-4 h-4" />
              <span>{imageFile ? '이미지 변경' : '이미지 업로드'}</span>
            </label>
            <Input
              id="market-image-file"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const selected = event.target.files?.[0] || null;
                setImageFile(selected);
              }}
            />
            {imagePreviewUrl && (
              <img
                src={imagePreviewUrl}
                alt="업로드 미리보기"
                className="w-full max-h-56 rounded-md border border-white/10 object-cover"
              />
            )}
            <Input
              value={imageUrlInput}
              onChange={(event) => setImageUrlInput(event.target.value)}
              placeholder="또는 이미지 URL 입력 (선택)"
              className="border-gray-800 bg-gray-950 text-gray-100 placeholder:text-gray-500"
              type="url"
            />
          </div>

          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="상품 설명"
            className="min-h-36 border-gray-800 bg-gray-950 text-gray-100 placeholder:text-gray-500"
            required
            maxLength={2000}
          />

          <Button
            type="submit"
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white"
            disabled={submitting || !title.trim() || !description.trim() || !price}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? '수정하기' : '등록하기'}
          </Button>
        </form>
        )}
      </main>
    </div>
  );
}
