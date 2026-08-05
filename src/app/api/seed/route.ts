import { db, books, categories, appSettings, eq, count, sql } from "@/lib/db";
import { encrypt, hashPassword } from "@/lib/encryption";
import { NextResponse } from "next/server";

const SAMPLE_BOOKS = [
  {
    title: "دیوان حافظ",
    author: "خواجه شمس‌الدین محمد حافظ شیرازی",
    categoryId: null,
    description: "مجموعه غزلیات خواجه حافظ شیرازی",
    coverColor: "#8b5cf6",
    content: [
      "الا یا اهل بیت عصمت و طهارت",
      "پناه فقیران و شیوه راه راستان",
      "نور چشم منم که به دیدار شمایم",
      "وز حسرت شاید کز من بترسان",
      "",
      "صبا را بده که نسیم خوش آورد",
      "ز عبیر خوش بو گل هم‌نفس آورد",
      "برگ‌ها و شاخه‌ها نو لب و دهن دارند",
      "چون محمد از خدمت گل هم‌نفس آورد",
      "",
      "ای صبا ای نسیم سحرگاهی",
      "بهار آمد دل بیا بیا",
      "گل و لاله به رخ سمن هلا هلا",
      "بلبل به باغ ما آیا آیا",
    ].join("\n"),
  },
  {
    title: "بوشهر و دشتستان",
    author: "سعید نفیسی",
    categoryId: null,
    description: "تاریخ و جغرافیای بوشهر و دشتستان",
    coverColor: "#059669",
    content: [
      "بوشهر یکی از قدیمی‌ترین بنادر خلیج فارس است که تاریخ آن به دوران باستان‌می‌گردد. این شهر در جنوب ایران قرار دارد و از مهم‌ترین مراکز تجاری و فرهنگی منطقه به شمار می‌رود.",
      "",
      "بوشهر در گذشته با نام‌های مختلفی نیز شناخته می‌شد. این شهر در طول تاریخ تحت تأثیر تمدن‌های مختلفی بوده است، از جمله تمدن ایلامی، فارسی، یونانی و اسلامی.",
      "",
      "دشتستان منطقه‌ای وسیع در شمال بوشهر است که شامل شهرها و روستاهای متعددی می‌شود. این منطقه از نظر تاریخی و فرهنگی اهمیت زیادی دارد.",
      "",
      "مردم بوشهر و دشتستان به گویش بوشهری صحبت می‌کنند که یکی از گویش‌های زبان فارسی است. این گویش ویژگی‌های منحصر به فردی دارد که آن را از سایر گویش‌های فارسی متمایز می‌کند.",
      "",
      "آداب و رسوم مردم این منطقه بسیار غنی و متنوع است. از جمله مراسم عاشورا، شب یلدا، نوروز و سایر مناسبت‌ها که هر کدام با آیین‌های خاص خود برگزار می‌شوند.",
      "",
      "غذاهای محلی بوشهر نیز بسیار معروف هستند. ماهی، میگو و غذاهای دریایی از مهم‌ترین بخش‌های غذای مردم این منطقه هستند.",
    ].join("\n"),
  },
  {
    title: "چگونه با مردم رفتار کنیم",
    author: "دیل کارنگی",
    categoryId: null,
    description: "یکی از معروف‌ترین کتاب‌های مهارت‌های ارتباطی",
    coverColor: "#dc2626",
    content: [
      "چگونه با مردم رفتار کنیم",
      "تألیف: دیل کارنگی",
      "",
      "اصل اول: انتقاد نکنید",
      "انتقاد مانند کولر است. در هوای سرد بر کولر می‌اندازیم تا گرم شود و در هوای گرم بر یخ می‌اندازیم تا خنک شود.",
      "",
      "اصل دوم: صادقانه تحسین کنید",
      "یگ بزرگ‌ترین نیازی که انسان دارد، نیاز به احساس مهم بودن است. اگر ما صادقانه به دیگران احساس اهمیت بدهیم، آن‌ها نیز ما را دوست خواهند داشت.",
      "",
      "اصل سوم: توجه به خواسته‌های دیگران",
      "مهم نیست شما چه می‌خواهید. مهم این است که دیگران چه می‌خواهند. اگر شما بفهمید دیگران چه می‌خواهند و به آن‌ها نشان دهید که چگونه می‌توانند به خواسته‌های خود برسند.",
      "",
      "اصل چهارم: به طور واقعی به دیگران علاقه‌مند شوید",
      "شما می‌توانید در دو ماه بیشتر دوستان جدید پیدا کنید که با تلاش برای جلب توجه دیگران در دو سال پیدا می‌کنید.",
      "",
      "اصل پنجم: لبخند بزنید",
      "عملی ساده است اما تأثیر عظیمی دارد. لبخند پیامی است که می‌گوید: من از دیدن شما خوشحالم.",
      "",
      "اصل ششم: نام دیگران را به طور صحیح بنویسید",
      "انسان از چیزی که بیشتر از همه به آن علاقه دارد نام خود است.",
    ].join("\n"),
  },
];

export async function POST() {
  try {
    const hashedPw = hashPassword("admin");

    /* Upsert admin password */
    const [existingSetting] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, "adminPassword"))
      .limit(1);

    if (existingSetting) {
      await db
        .update(appSettings)
      .set({ value: hashedPw })
        .where(eq(appSettings.key, "adminPassword"));
    } else {
      await db
        .insert(appSettings)
        .values({ id: "singleton", key: "adminPassword", value: hashedPw });
    }

    /* Upsert categories */
    const catNames = ["ادبیات", "تاریخ", "مطالعات اجتماعی"];
    const catIds: string[] = [];
    for (const name of catNames) {
      const [existingCat] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.name, name))
        .limit(1);

      if (existingCat) {
        catIds.push(existingCat.id);
      } else {
        const [createdCat] = await db
          .insert(categories)
          .values({ id: crypto.randomUUID(), name, createdAt: new Date().toISOString() })
          .returning({ id: categories.id });
        catIds.push(createdCat.id);
      }
    }

    /* Check existing books */
    const [bookCountResult] = await db
      .select({ total: count(books.id) })
      .from(books)
      .limit(1);

    if (bookCountResult && bookCountResult.total > 0) {
      return NextResponse.json({
        message: "داده‌ها قبلاً ایجاد شده‌اند",
      });
    }

    /* Insert sample books */
    for (let i = 0; i < SAMPLE_BOOKS.length; i++) {
      const b = SAMPLE_BOOKS[i];
      const now = new Date().toISOString();
      await db.insert(books).values({
        id: crypto.randomUUID(),
        title: b.title,
        author: b.author,
        description: b.description,
        content: encrypt(b.content),
        coverColor: b.coverColor,
        categoryId: catIds[i] || null,
        createdAt: now,
        updatedAt: now,
      });
    }

    return NextResponse.json({
      message: "داده‌های نمونه با موفقیت ایجاد شدند",
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "خطا در ایجاد داده‌های نمونه" },
      { status: 500 }
    );
  }
}